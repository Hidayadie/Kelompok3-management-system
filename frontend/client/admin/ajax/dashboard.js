
"use strict";

const isLocalDev = window.location.hostname === "localhost" && window.location.port === "8081";
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || (isLocalDev ? "http://localhost:8080" : window.location.origin);

const DASHBOARD_API =
    `${API_BASE}/api/private/dashboard/summary`;

/**
 * Mengisi teks berdasarkan ID elemen HTML.
 */
function setText(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === null || value === undefined ? 0 : value;
}

/**
 * Mengubah nilai menjadi format angka Indonesia.
 */
function formatNumber(value) {
    const number = Number(value ?? 0);

    return number.toLocaleString("id-ID");
}

/**
 * Memuat statistik dashboard.
 */
async function loadDashboardSummary() {
    try {
        const response = await fetch(DASHBOARD_API, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: Gagal mengambil data dashboard`
            );
        }

        const result = await response.json();

        console.log("Respons API dashboard:", result);

        // Mendukung respons yang dibungkus dalam properti data
        // maupun respons yang langsung berisi statistik.
        const data = result.data ?? result;

        // ==========================================
        // STATISTIK ASET
        // ==========================================

        setText(
            "totalAssets",
            formatNumber(data.total_assets)
        );

        setText(
            "availableAssets",
            formatNumber(data.available_assets)
        );

        setText(
            "borrowedAssets",
            formatNumber(data.borrowed_assets)
        );

        // Aset rusak yang masih bisa diperbaiki.
        setText(
            "brokenAssets",
            formatNumber(data.needs_repair)
        );

        // Aset rusak yang tidak bisa diperbaiki.
        setText(
            "rusakCantRepaired",
            formatNumber(
                data.rusak_cantRepaired ??
                data.rusak_cant_repaired ??
                0
            )
        );

        // ==========================================
        // RINGKASAN KONDISI ASET
        // ==========================================

        const condition = data.condition_summary ?? {};

        const totalCondition = Number(
            condition.total ??
            condition.total_assets ??
            0
        );

        const good = Number(
            condition.good ??
            condition.baik ??
            0
        );

        const maintenance = Number(
            condition.maintenance ??
            condition.perawatan ??
            0
        );

        const damaged = Number(
            condition.damaged ??
            condition.rusak ??
            0
        );

        setText("conditionTotal", formatNumber(totalCondition));
        setText("conditionGood", formatNumber(good));
        setText("conditionMaintenance", formatNumber(maintenance));
        setText("conditionDamaged", formatNumber(damaged));

        // Menghitung persentase kondisi aset.
        const getPercentage = (value) => {
            if (totalCondition <= 0) {
                return 0;
            }

            return Math.min(
                100,
                Math.max(0, (value / totalCondition) * 100)
            );
        };

        const progressGood = document.getElementById("progressGood");
        const progressMaintenance =
            document.getElementById("progressMaintenance");
        const progressDamaged =
            document.getElementById("progressDamaged");

        if (progressGood) {
            progressGood.style.width =
                `${getPercentage(good)}%`;
            progressGood.setAttribute(
                "aria-valuenow",
                getPercentage(good)
            );
        }

        if (progressMaintenance) {
            progressMaintenance.style.width =
                `${getPercentage(maintenance)}%`;
            progressMaintenance.setAttribute(
                "aria-valuenow",
                getPercentage(maintenance)
            );
        }

        if (progressDamaged) {
            progressDamaged.style.width =
                `${getPercentage(damaged)}%`;
            progressDamaged.setAttribute(
                "aria-valuenow",
                getPercentage(damaged)
            );
        }

        // ==========================================
        // ASET TERBARU
        // ==========================================

        //renderRecentAssets(data.recent_assets ?? []);
        
        console.log(
            "Dashboard berhasil dimuat:",
            data
        );
    } catch (error) {
        console.error(
            "Gagal memuat dashboard:",
            error
        );
    }
}

/**
 * Menampilkan daftar aset terbaru.
 */
function renderRecentAssets(assets) {
    const tbody = document.getElementById("recentAssetsBody");

    if (!tbody) {
        console.warn(
            "Elemen recentAssetsBody tidak ditemukan."
        );
        return;
    }

    tbody.replaceChildren();

    if (!Array.isArray(assets) || assets.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "text-center text-muted";
        cell.textContent = "Belum ada data aset.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    assets.forEach((asset, index) => {
        const row = document.createElement("tr");

        const code = asset.code_asset ?? asset.code ?? "-";
        const name = asset.nama_asset ?? asset.name ?? "-";
        const category =
            asset.category_name ??
            asset.category_detail?.name ??
            asset.category ??
            "-";
        const status = asset.status;

        let statusText = "-";
        let statusClass = "bg-secondary";

        if (status === true || status === "true") {
            statusText = "Tersedia";
            statusClass = "bg-success";
        } else if (status === false || status === "false") {
            statusText = "Tidak tersedia";
            statusClass = "bg-warning text-dark";
        } else if (asset.status_name) {
            statusText = asset.status_name;
        }

        const values = [
            index + 1,
            code,
            name,
            category
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = `badge ${statusClass}`;
        badge.textContent = statusText;

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}

const LAST_ASSET_API =
    `${API_BASE}/api/private/dashboard/lastAsset`;

/**
 * Memuat data inventaris terbaru dari API.
 */
async function loadLastAssets() {
    const tbody = document.getElementById("recentAssetsBody");

    if (!tbody) {
        console.error("Elemen recentAssetsBody tidak ditemukan.");
        return;
    }

    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    Memuat data inventaris...
                </td>
            </tr>
        `;

        const response = await fetch(LAST_ASSET_API, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: Gagal mengambil data inventaris`
            );
        }

        const result = await response.json();

console.log("Respons API lastAsset:", result);

let assets = [];

if (Array.isArray(result)) {
    assets = result;
} else if (Array.isArray(result.data)) {
    assets = result.data;
} else if (Array.isArray(result.data?.data)) {
    assets = result.data.data;
} else if (Array.isArray(result.assets)) {
    assets = result.assets;
} else if (Array.isArray(result.data?.assets)) {
    assets = result.data.assets;
}

console.log("Data aset yang akan ditampilkan:", assets);

renderLastAssets(assets, tbody);
    
    } catch (error) {
        console.error("Gagal memuat inventaris terbaru:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    Gagal memuat data inventaris.
                </td>
            </tr>
        `;
    }
}

/**
 * Menampilkan data aset ke dalam tabel.
 */
function renderLastAssets(assets, tbody) {
    tbody.replaceChildren();

    if (!Array.isArray(assets) || assets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    Belum ada data inventaris.
                </td>
            </tr>
        `;
        return;
    }

    assets.forEach((asset) => {
        const row = document.createElement("tr");

        // Kode aset
        const codeCell = document.createElement("td");
        codeCell.textContent = asset.code_asset ?? "-";
        row.appendChild(codeCell);

        // Nama aset
        const nameCell = document.createElement("td");
        nameCell.textContent = asset.nama_asset ?? "-";
        row.appendChild(nameCell);

        // Kategori
        const categoryCell = document.createElement("td");
        categoryCell.textContent =
            asset.category_name ??
            asset.category_detail?.name ??
            asset.category ??
            "-";
        row.appendChild(categoryCell);

        // Kondisi aset
        const conditionCell = document.createElement("td");
        const conditionBadge = document.createElement("span");

        const condition = String(
            asset.condition ?? ""
        ).toLowerCase();

        conditionBadge.className = "badge";

        switch (condition) {
            case "baik":
                conditionBadge.classList.add("bg-success");
                conditionBadge.textContent = "Baik";
                break;

            case "perawatan":
            case "maintenance":
                conditionBadge.classList.add("bg-warning", "text-dark");
                conditionBadge.textContent = "Perawatan";
                break;

            case "rusak":
            case "damaged":
                conditionBadge.classList.add("bg-danger");
                conditionBadge.textContent = "Rusak";
                break;

            default:
                conditionBadge.classList.add("bg-secondary");
                conditionBadge.textContent =
                    asset.condition ?? "-";
        }

        conditionCell.appendChild(conditionBadge);
        row.appendChild(conditionCell);

        // Status aset: kolom status pada model berupa boolean
        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className = "badge";

        if (asset.status === true || asset.status === "true") {
            statusBadge.classList.add("bg-success");
            statusBadge.textContent = "Tersedia";
        } else if (
            asset.status === false ||
            asset.status === "false"
        ) {
            statusBadge.classList.add("bg-warning", "text-dark");
            statusBadge.textContent = "Tidak tersedia";
        } else {
            statusBadge.classList.add("bg-secondary");
            statusBadge.textContent = asset.status ?? "-";
        }

        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}


//load recent activities

const ACTIVITIES_API =
    `${API_BASE}/api/private/dashboard/activities`;

// Konfigurasi ikon dan warna berdasarkan jenis aktivitas.
function getActivityStyle(type) {
    const styles = {
        asset_created: {
            title: "Aset baru ditambahkan",
            icon: "bi-plus-circle",
            color: "primary"
        },
        asset_updated: {
            title: "Data aset diperbarui",
            icon: "bi-pencil-square",
            color: "primary"
        },
        complaint_created: {
            title: "Keluhan aset baru",
            icon: "bi-tools",
            color: "warning"
        },
        complaint_updated: {
            title: "Keluhan diperbarui",
            icon: "bi-wrench-adjustable",
            color: "warning"
        },
        asset_broken_created: {
            title: "Kerusakan aset dicatat",
            icon: "bi-exclamation-triangle",
            color: "danger"
        },
        asset_broken_updated: {
            title: "Data kerusakan diperbarui",
            icon: "bi-tools",
            color: "danger"
        },
        asset_lending_created: {
            title: "Peminjaman aset",
            icon: "bi-box-arrow-up-right",
            color: "info"
        },
        asset_lending_updated: {
            title: "Peminjaman diperbarui",
            icon: "bi-pencil-square",
            color: "info"
        },
        asset_lending_returned: {
            title: "Pengembalian aset",
            icon: "bi-arrow-return-left",
            color: "success"
        }
    };

    return styles[type] || {
        title: "Aktivitas sistem",
        icon: "bi-clock-history",
        color: "secondary"
    };
}

// Format waktu sesuai zona waktu Indonesia Barat.
function formatActivityTime(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).replace(/\./g, ":") + " WIB";
}

// Membuat elemen aktivitas tanpa memasukkan deskripsi
// langsung sebagai HTML, agar teks JSON aman ditampilkan.
function createActivityElement(activity) {
    const style = getActivityStyle(activity.activity_type);

    const wrapper = document.createElement("div");
    wrapper.className = "activity d-flex gap-3 mb-3";

    const iconWrapper = document.createElement("div");
    iconWrapper.className =
        `activity-icon bg-${style.color}-subtle text-${style.color}`;

    const icon = document.createElement("i");
    icon.className = `bi ${style.icon}`;
    iconWrapper.appendChild(icon);

    const content = document.createElement("div");
    content.className = "min-w-0";

    const title = document.createElement("div");
    title.className = "fw-bold small";
    title.textContent = style.title;

    const description = document.createElement("div");
    description.className = "muted small";
    description.textContent = activity.description || "-";

    const time = document.createElement("div");
    time.className = "muted mt-1 small";
    time.textContent = formatActivityTime(activity.created_at);

    content.append(title, description, time);
    wrapper.append(iconWrapper, content);

    return wrapper;
}

// Mengambil dan menampilkan aktivitas dari API.
async function loadRecentActivities() {
    const container = document.getElementById("recentActivities");

    if (!container) {
        console.error("Elemen #recentActivities tidak ditemukan.");
        return;
    }

    container.replaceChildren();

    const loading = document.createElement("div");
    loading.className = "text-muted small";
    loading.textContent = "Memuat aktivitas terbaru...";
    container.appendChild(loading);

    try {
        const response = await fetch(ACTIVITIES_API, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Mendukung respons API dengan properti data berupa array.
        const activities = Array.isArray(result.data)
            ? result.data.slice(0, 5)
            : [];

        container.replaceChildren();

        if (activities.length === 0) {
            const empty = document.createElement("div");
            empty.className = "text-muted small";
            empty.textContent = "Belum ada aktivitas terbaru.";
            container.appendChild(empty);
            return;
        }

        activities.forEach(activity => {
            container.appendChild(createActivityElement(activity));
        });
    } catch (error) {
        console.error("Gagal memuat aktivitas:", error);

        container.replaceChildren();

        const errorMessage = document.createElement("div");
        errorMessage.className = "text-danger small";
        errorMessage.textContent =
            "Aktivitas gagal dimuat. Periksa koneksi API dan autentikasi.";

        container.appendChild(errorMessage);
    }
}


/**
 * Jalankan setelah halaman selesai dimuat.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Memuat statistik dan kondisi inventaris
    loadDashboardSummary();

    // Memuat tabel inventaris hanya dari endpoint lastAsset
    loadLastAssets();
    loadRecentActivities();
});
