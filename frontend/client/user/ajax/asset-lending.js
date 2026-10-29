$(document).ready(function () {
    // ==========================================
    // KONFIGURASI API
    // ==========================================

    // Jika aplikasi Anda sudah memiliki API_BASE dari env,
    // gunakan nilai konfigurasi tersebut.
    const API_BASE = window.API_BASE || "http://localhost:8080";

    const API_LENDING = API_BASE + "/api/private/asset-lending";

    // Sesuaikan dengan endpoint daftar aset di backend Anda.
    const API_ASSET = API_BASE + "/api/private/assets";

    const modalForm = new bootstrap.Modal(
        document.getElementById("modalAssetLending")
    );

    const modalDetail = new bootstrap.Modal(
        document.getElementById("modalDetail")
    );

    let lendingData = [];
    let assetsCache = [];

    // ==========================================
    // HELPER AJAX
    // ==========================================

    function ajaxRequest(options) {
        return $.ajax({
            ...options,
            xhrFields: {
                withCredentials: true
            },
            headers: {
                ...(options.headers || {})
            }
        });
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return map[char];
        });
    }

    function getErrorMessage(xhr) {
        if (xhr.responseJSON) {
            return xhr.responseJSON.message ||
                xhr.responseJSON.error ||
                "Permintaan gagal diproses.";
        }

        if (xhr.status === 401 || xhr.status === 403) {
            return "Sesi berakhir atau Anda tidak memiliki akses.";
        }

        return "Terjadi kesalahan pada server.";
    }

    function normalizeArray(response) {
        if (Array.isArray(response)) {
            return response;
        }

        if (response && Array.isArray(response.data)) {
            return response.data;
        }

        if (response && Array.isArray(response.items)) {
            return response.items;
        }

        if (response && Array.isArray(response.data?.items)) {
            return response.data.items;
        }

        return [];
    }

    function formatTanggal(value) {
        if (!value) return "-";

        const date = String(value).substring(0, 10);
        const parts = date.split("-");

        if (parts.length !== 3) return escapeHtml(value);

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function getStatus(item) {
        return String(
            item.status ??
            item.Status ??
            "menunggu"
        ).toLowerCase();
    }

    function getStatusBadge(status) {
        const normalized = String(status || "menunggu")
            .toLowerCase()
            .replace(/\s+/g, "_");

        const config = {
            menunggu: ["Menunggu", "status-menunggu"],
            pending: ["Menunggu", "status-menunggu"],
            disetujui: ["Disetujui", "status-disetujui"],
            approved: ["Disetujui", "status-disetujui"],
            ditolak: ["Ditolak", "status-ditolak"],
            rejected: ["Ditolak", "status-ditolak"],
            dipinjam: ["Sedang Dipinjam", "status-dipinjam"],
            borrowed: ["Sedang Dipinjam", "status-dipinjam"],
            selesai: ["Selesai", "status-selesai"],
            returned: ["Selesai", "status-selesai"]
        };

        const result = config[normalized] ||
            [normalized, "status-selesai"];

        return `<span class="status-badge ${result[1]}">
            ${escapeHtml(result[0])}
        </span>`;
    }

    function getAssetID(item) {
        return item.assetID ??
            item.asset_id ??
            item.AssetID ??
            item.asset?.id ??
            item.asset?.ID ??
            "";
    }

    function getAssetName(item) {
        return item.assetName ??
            item.asset_name ??
            item.asset?.name ??
            item.asset?.nama ??
            item.asset?.Name ??
            item.nama_asset ??
            "-";
    }

    function getTanggalPinjam(item) {
        return item.tanggalPinjam ??
            item.borrowDate ??
            item.borrow_date ??
            item.tanggal_pinjam ??
            item.startDate ??
            item.start_date ??
            "";
    }

    function getTanggalKembali(item) {
        return item.tanggalKembali ??
            item.returnDate ??
            item.return_date ??
            item.tanggal_kembali ??
            item.endDate ??
            item.end_date ??
            "";
    }

    function getTujuan(item) {
        return item.tujuan ??
            item.purpose ??
            item.description ??
            item.keterangan ??
            "";
    }

    function getLendingID(item) {
        return item.id ?? item.ID ?? item.uuid ?? "";
    }

    function getKode(item) {
        return item.code ??
            item.kode ??
            item.kode_peminjaman ??
            "-";
    }

    // ==========================================
    // MEMUAT DATA PEMINJAMAN
    // ==========================================

    function loadAssetLending() {
        $("#tableAssetLending").html(`
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm"></div>
                    Memuat data peminjaman...
                </td>
            </tr>
        `);

        $("#btnRefresh").prop("disabled", true);

        ajaxRequest({
            url: API_LENDING,
            method: "GET",
            dataType: "json"
        })
        .done(function (response) {
            lendingData = normalizeArray(response);

            renderTable();
            renderSummary();
        })
        .fail(function (xhr) {
            $("#tableAssetLending").html(`
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">
                        Gagal memuat data peminjaman.
                        <br>
                        <small>${escapeHtml(getErrorMessage(xhr))}</small>
                    </td>
                </tr>
            `);

            $("#totalPengajuan, #totalMenunggu, #totalDipinjam, #totalSelesai")
                .text("0");

            if (xhr.status === 401 || xhr.status === 403) {
                Swal.fire({
                    icon: "warning",
                    title: "Akses ditolak",
                    text: getErrorMessage(xhr)
                });
            }
        })
        .always(function () {
            $("#btnRefresh").prop("disabled", false);
        });
    }

    // ==========================================
    // MENAMPILKAN TABEL
    // ==========================================

    function renderTable() {
        const keyword = $("#searchInput").val()
            .trim()
            .toLowerCase();

        const selectedStatus = $("#filterStatus").val()
            .toLowerCase();

        const filtered = lendingData.filter(function (item) {
            const text = [
                getKode(item),
                getAssetName(item),
                getTujuan(item)
            ].join(" ").toLowerCase();

            const status = getStatus(item);

            const cocokKeyword = text.includes(keyword);
            const cocokStatus = !selectedStatus ||
                status === selectedStatus;

            return cocokKeyword && cocokStatus;
        });

        if (filtered.length === 0) {
            $("#tableAssetLending").html(`
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="bi bi-inbox fs-2"></i>
                        <p class="mt-2 mb-0">
                            Tidak ada data peminjaman yang ditemukan.
                        </p>
                    </td>
                </tr>
            `);

            $("#infoJumlah").text("Menampilkan 0 data");
            return;
        }

        let html = "";

        filtered.forEach(function (item, index) {
            const status = getStatus(item);
            const id = getLendingID(item);

            html += `
                <tr>
                    <td>${index + 1}</td>

                    <td>${escapeHtml(getKode(item))}</td>

                    <td>${escapeHtml(getAssetName(item))}</td>

                    <td>${formatTanggal(getTanggalPinjam(item))}</td>

                    <td>${formatTanggal(getTanggalKembali(item))}</td>

                    <td>
                        ${escapeHtml(getTujuan(item) || "-")}
                    </td>

                    <td>${getStatusBadge(status)}</td>

                    <td>
                        <div class="action-buttons">
                            <button type="button"
                                class="btn btn-sm btn-info btn-detail"
                                data-id="${escapeHtml(id)}"
                                title="Detail">
                                <i class="bi bi-eye"></i>
                            </button>

                            ${
                                ["menunggu", "pending"].includes(status)
                                ? `
                                    <button type="button"
                                        class="btn btn-sm btn-warning btn-edit"
                                        data-id="${escapeHtml(id)}"
                                        title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>

                                    <button type="button"
                                        class="btn btn-sm btn-danger btn-hapus"
                                        data-id="${escapeHtml(id)}"
                                        title="Batalkan">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                `
                                : ""
                            }
                        </div>
                    </td>
                </tr>
            `;
        });

        $("#tableAssetLending").html(html);

        $("#infoJumlah").text(
            `Menampilkan ${filtered.length} dari ${lendingData.length} data`
        );
    }

    // ==========================================
    // RINGKASAN
    // ==========================================

    function renderSummary() {
        $("#totalPengajuan").text(lendingData.length);

        $("#totalMenunggu").text(
            lendingData.filter(item =>
                ["menunggu", "pending"].includes(getStatus(item))
            ).length
        );

        $("#totalDipinjam").text(
            lendingData.filter(item =>
                ["dipinjam", "borrowed"].includes(getStatus(item))
            ).length
        );

        $("#totalSelesai").text(
            lendingData.filter(item =>
                ["selesai", "returned"].includes(getStatus(item))
            ).length
        );
    }

    // ==========================================
    // MEMUAT PILIHAN ASET
    // ==========================================

    function loadAssets(selectedID = "") {
        $("#assetID").html(
            '<option value="">Memuat daftar aset...</option>'
        );

        ajaxRequest({
            url: API_ASSET,
            method: "GET",
            dataType: "json"
        })
        .done(function (response) {
            assetsCache = normalizeArray(response);

            let html = '<option value="">Pilih aset</option>';

            assetsCache.forEach(function (asset) {
                const id = asset.id ??
                    asset.ID ??
                    asset.uuid ??
                    "";

                const name = asset.name ??
                    asset.nama ??
                    asset.asset_name ??
                    asset.Name ??
                    "Aset tanpa nama";

                const selected = String(id) === String(selectedID)
                    ? "selected"
                    : "";

                html += `
                    <option value="${escapeHtml(id)}" ${selected}>
                        ${escapeHtml(name)}
                    </option>
                `;
            });

            $("#assetID").html(html);

            if (assetsCache.length === 0) {
                $("#assetID").html(
                    '<option value="">Tidak ada aset tersedia</option>'
                );
            }
        })
        .fail(function (xhr) {
            $("#assetID").html(
                '<option value="">Gagal memuat aset</option>'
            );

            Swal.fire({
                icon: "error",
                title: "Gagal memuat aset",
                text: getErrorMessage(xhr)
            });
        });
    }

    // ==========================================
    // TAMBAH PEMINJAMAN
    // ==========================================

    $("#btnTambah").on("click", function () {
        $("#formAssetLending")[0].reset();
        $("#lendingId").val("");

        $("#modalTitle").text("Ajukan Peminjaman Aset");
        $("#btnSimpan").html(
            '<i class="bi bi-save"></i> Simpan Pengajuan'
        );

        loadAssets();
        modalForm.show();
    });

    // ==========================================
    // SIMPAN / UPDATE
    // ==========================================

    $("#formAssetLending").on("submit", function (event) {
        event.preventDefault();

        const id = $("#lendingId").val();

        const tanggalPinjam = $("#tanggalPinjam").val();
        const tanggalKembali = $("#tanggalKembali").val();

        if (tanggalKembali < tanggalPinjam) {
            Swal.fire({
                icon: "warning",
                title: "Tanggal tidak valid",
                text: "Tanggal kembali tidak boleh sebelum tanggal pinjam."
            });

            return;
        }

        const payload = {
            assetID: $("#assetID").val(),
            tanggalPinjam: tanggalPinjam,
            tanggalKembali: tanggalKembali,
            tujuan: $("#tujuan").val().trim()
        };

        if (!payload.assetID || !payload.tujuan) {
            Swal.fire({
                icon: "warning",
                title: "Data belum lengkap",
                text: "Pilih aset dan isi tujuan peminjaman."
            });

            return;
        }

        const url = id
            ? `${API_LENDING}/${encodeURIComponent(id)}`
            : API_LENDING;

        const method = id ? "PUT" : "POST";

        $("#btnSimpan").prop("disabled", true).html(`
            <span class="spinner-border spinner-border-sm"></span>
            Menyimpan...
        `);

        ajaxRequest({
            url: url,
            method: method,
            contentType: "application/json",
            data: JSON.stringify(payload),
            dataType: "json"
        })
        .done(function () {
            modalForm.hide();

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: id
                    ? "Data peminjaman berhasil diperbarui."
                    : "Pengajuan peminjaman berhasil dikirim.",
                timer: 1800,
                showConfirmButton: false
            });

            loadAssetLending();
        })
        .fail(function (xhr) {
            Swal.fire({
                icon: "error",
                title: "Gagal menyimpan",
                text: getErrorMessage(xhr)
            });
        })
        .always(function () {
            $("#btnSimpan").prop("disabled", false).html(
                '<i class="bi bi-save"></i> Simpan Pengajuan'
            );
        });
    });

    // ==========================================
    // DETAIL PEMINJAMAN
    // ==========================================

    $("#tableAssetLending").on("click", ".btn-detail", function () {
        const id = $(this).data("id");

        const item = lendingData.find(
            data => String(getLendingID(data)) === String(id)
        );

        if (!item) return;

        $("#detailContent").html(`
            <table class="table table-bordered">
                <tr>
                    <th width="35%">Kode Peminjaman</th>
                    <td>${escapeHtml(getKode(item))}</td>
                </tr>

                <tr>
                    <th>Aset</th>
                    <td>${escapeHtml(getAssetName(item))}</td>
                </tr>

                <tr>
                    <th>Tanggal Pinjam</th>
                    <td>${formatTanggal(getTanggalPinjam(item))}</td>
                </tr>

                <tr>
                    <th>Tanggal Kembali</th>
                    <td>${formatTanggal(getTanggalKembali(item))}</td>
                </tr>

                <tr>
                    <th>Tujuan</th>
                    <td>${escapeHtml(getTujuan(item) || "-")}</td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>${getStatusBadge(getStatus(item))}</td>
                </tr>

                <tr>
                    <th>Catatan</th>
                    <td>${escapeHtml(item.note ?? item.catatan ?? "-")}</td>
                </tr>
            </table>
        `);

        modalDetail.show();
    });

    // ==========================================
    // EDIT PEMINJAMAN
    // ==========================================

    $("#tableAssetLending").on("click", ".btn-edit", function () {
        const id = $(this).data("id");

        const item = lendingData.find(
            data => String(getLendingID(data)) === String(id)
        );

        if (!item) return;

        if (!["menunggu", "pending"].includes(getStatus(item))) {
            Swal.fire(
                "Tidak dapat diedit",
                "Peminjaman ini tidak lagi berstatus menunggu.",
                "warning"
            );

            return;
        }

        $("#lendingId").val(getLendingID(item));

        $("#tanggalPinjam").val(
            String(getTanggalPinjam(item)).substring(0, 10)
        );

        $("#tanggalKembali").val(
            String(getTanggalKembali(item)).substring(0, 10)
        );

        $("#tujuan").val(getTujuan(item));

        $("#modalTitle").text("Edit Pengajuan Peminjaman");

        $("#btnSimpan").html(
            '<i class="bi bi-save"></i> Simpan Perubahan'
        );

        loadAssets(getAssetID(item));
        modalForm.show();
    });

    // ==========================================
    // BATALKAN PEMINJAMAN
    // ==========================================

    $("#tableAssetLending").on("click", ".btn-hapus", function () {
        const id = $(this).data("id");

        const item = lendingData.find(
            data => String(getLendingID(data)) === String(id)
        );

        if (!item) return;

        Swal.fire({
            title: "Batalkan pengajuan?",
            text: "Pengajuan peminjaman ini akan dibatalkan.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, batalkan",
            cancelButtonText: "Kembali"
        }).then(function (result) {
            if (!result.isConfirmed) return;

            ajaxRequest({
                url: `${API_LENDING}/${encodeURIComponent(id)}`,
                method: "DELETE",
                dataType: "json"
            })
            .done(function () {
                Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: "Pengajuan berhasil dibatalkan.",
                    timer: 1600,
                    showConfirmButton: false
                });

                loadAssetLending();
            })
            .fail(function (xhr) {
                Swal.fire({
                    icon: "error",
                    title: "Gagal membatalkan",
                    text: getErrorMessage(xhr)
                });
            });
        });
    });

    // ==========================================
    // SEARCH, FILTER, REFRESH
    // ==========================================

    $("#searchInput, #filterStatus").on("input change", function () {
        renderTable();
    });

    $("#btnRefresh").on("click", function () {
        loadAssetLending();
    });

    // ==========================================
    // MULAI
    // ==========================================

    loadAssetLending();
});