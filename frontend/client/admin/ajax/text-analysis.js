"use strict";

    const API_BASE= window.APP_CONFIG.API_BASE_URL; //"http://localhost:8080",
    //const FRONTEND_BASE_URL= window.APP_CONFIG.BASIC_URL; //"http://localhost:8088",

const TEXT_ANALYSIS_API =`${API_BASE}/api/private/text-analysis`;

// Instance grafik disimpan agar bisa diperbarui.
let reportsByClusterChartInstance = null;
let damagedUnitsByClusterChartInstance = null;

/**
 * Mengambil elemen HTML berdasarkan ID.
 */
function getElement(id) {
    return document.getElementById(id);
}

/**
 * Menampilkan pesan status analisis.
 */
function showAnalysisMessage(message, type = "info") {
    const element = getElement("analysisMessage");

    if (!element) return;

    element.className = `alert alert-${type}`;
    element.textContent = message;
}

/**
 * Menyembunyikan pesan status.
 */
function hideAnalysisMessage() {
    const element = getElement("analysisMessage");

    if (!element) return;

    element.className = "alert d-none";
    element.textContent = "";
}

/**
 * Membuat elemen HTML dengan aman.
 */
function createElement(tag, className = "", text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

/**
 * Format tanggal laporan.
 */
function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

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

/**
 * Label sumber laporan.
 */
function getSourceLabel(source) {
    if (source === "complaints") {
        return "Keluhan";
    }

    if (source === "damage") {
        return "Kerusakan";
    }

    return "Laporan";
}

/**
 * Format angka Indonesia.
 */
function formatNumber(value) {
    const number = Number(value ?? 0);

    return Number.isFinite(number)
        ? number.toLocaleString("id-ID")
        : "0";
}

/**
 * Mengatur status tombol analisis.
 */
function setAnalyzeButtonLoading(loading) {
    const button = getElement("analyzeButton");

    if (!button) return;

    button.disabled = loading;

    if (loading) {
        button.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2" ' +
            'role="status" aria-hidden="true"></span>Menganalisis...';
    } else {
        button.innerHTML =
            '<i class="bi bi-stars me-2"></i>Analisis Sekarang';
    }
}

/**
 * Menampilkan statistik hasil analisis.
 */
function renderStatistics(data) {
    const groups = Array.isArray(data.groups)
        ? data.groups
        : [];

    const totalReports = getElement("totalReports");
    const totalClusters = getElement("totalClusters");
    const totalDamagedUnits = getElement("totalDamagedUnits");

    if (totalReports) {
        totalReports.textContent =
            formatNumber(data.total_reports);
    }

    if (totalClusters) {
        totalClusters.textContent =
            formatNumber(groups.length);
    }

    const totalUnits = groups.reduce((total, group) => {
        return total + Number(group.total_damaged_units || 0);
    }, 0);

    if (totalDamagedUnits) {
        totalDamagedUnits.textContent =
            formatNumber(totalUnits);
    }
}

/**
 * Membuat kartu satu kelompok clustering.
 */
function renderClusterCard(group, selectedSource) {
    const column = createElement(
        "div",
        "col-12 col-lg-6 col-xxl-4"
    );

    const card = createElement("div", "analysis-card");

    // Header kelompok.
    const header = createElement(
        "div",
        "d-flex justify-content-between align-items-start gap-2 mb-3"
    );

    const headingWrapper = createElement("div");

    const heading = createElement(
        "h3",
        "h6 fw-bold mb-2",
        group.name || `Kelompok ${group.cluster_id}`
    );

    const subheading = createElement(
        "div",
        "muted-text",
        `${formatNumber(group.report_count)} laporan`
    );

    headingWrapper.append(heading, subheading);

    const badge = createElement(
        "span",
        "badge text-bg-primary",
        `Cluster ${group.cluster_id}`
    );

    header.append(headingWrapper, badge);
    card.appendChild(header);

    // Kata kunci dominan.
    card.appendChild(
        createElement(
            "div",
            "small fw-semibold mb-2",
            "Kata kunci dominan"
        )
    );

    const keywordContainer = createElement("div", "mb-3");

    const keywords = Array.isArray(group.keywords)
        ? group.keywords
        : [];

    if (keywords.length === 0) {
        keywordContainer.appendChild(
            createElement(
                "span",
                "muted-text",
                "Tidak tersedia"
            )
        );
    } else {
        keywords.forEach(keyword => {
            keywordContainer.appendChild(
                createElement(
                    "span",
                    "keyword-badge",
                    keyword
                )
            );
        });
    }

    card.appendChild(keywordContainer);

    // Informasi unit rusak.
    if (
        selectedSource === "damage" ||
        selectedSource === "all"
    ) {
        card.appendChild(
            createElement(
                "div",
                "small mb-3 text-danger",
                `Total unit rusak: ${formatNumber(
                    group.total_damaged_units
                )}`
            )
        );
    }

    card.appendChild(
        createElement("hr", "my-3")
    );

    card.appendChild(
        createElement(
            "div",
            "small fw-semibold mb-2",
            "Daftar laporan"
        )
    );

    const itemContainer = createElement("div");

    const items = Array.isArray(group.items)
        ? group.items
        : [];

    if (items.length === 0) {
        itemContainer.appendChild(
            createElement(
                "div",
                "muted-text",
                "Tidak ada laporan."
            )
        );
    } else {
        items.forEach(item => {
            const record = createElement(
                "div",
                "record-item"
            );

            const recordHeader = createElement(
                "div",
                "d-flex justify-content-between align-items-start gap-2 mb-1"
            );

            recordHeader.appendChild(
                createElement(
                    "div",
                    "fw-semibold small",
                    item.title || `Laporan ${item.id || ""}`
                )
            );

            recordHeader.appendChild(
                createElement(
                    "span",
                    "badge text-bg-light border source-badge",
                    getSourceLabel(item.source)
                )
            );

            record.appendChild(recordHeader);

            record.appendChild(
                createElement(
                    "div",
                    "small mb-2",
                    item.description || "Tidak ada deskripsi."
                )
            );

            record.appendChild(
                createElement(
                    "div",
                    "muted-text",
                    `Status: ${item.status || "-"} · ${formatDate(
                        item.created_at
                    )}`
                )
            );

            if (item.source === "damage") {
                record.appendChild(
                    createElement(
                        "div",
                        "muted-text mt-1",
                        `Jumlah rusak: ${formatNumber(
                            item.quantity
                        )}`
                    )
                );
            }

            itemContainer.appendChild(record);
        });
    }

    card.appendChild(itemContainer);
    column.appendChild(card);

    return column;
}

/**
 * Membuat dan memperbarui grafik hasil clustering.
 *
 * Grafik 1:
 * Jumlah laporan per cluster.
 *
 * Grafik 2:
 * Jumlah unit rusak per cluster.
 */
function renderCharts(data, selectedSource) {
    if (typeof Chart === "undefined") {
        console.error(
            "Chart.js belum tersedia. Periksa koneksi CDN Chart.js."
        );

        showAnalysisMessage(
            "Data berhasil diproses, tetapi pustaka grafik Chart.js tidak tersedia.",
            "warning"
        );

        return;
    }

    const groups = Array.isArray(data.groups)
        ? data.groups
        : [];

    const labels = groups.map((group, index) => {
        return group.name ||
            `Cluster ${group.cluster_id ?? index + 1}`;
    });

    // ==========================================
    // GRAFIK 1: JUMLAH LAPORAN PER CLUSTER
    // ==========================================

    const reportCounts = groups.map(group => {
        return Number(group.report_count || 0);
    });

    const reportsCanvas = getElement(
        "reportsByClusterChart"
    );

    if (reportsCanvas) {
        if (reportsByClusterChartInstance) {
            reportsByClusterChartInstance.destroy();
            reportsByClusterChartInstance = null;
        }

        reportsByClusterChartInstance = new Chart(
            reportsCanvas,
            {
                type: "bar",

                data: {
                    labels: labels,

                    datasets: [
                        {
                            label: "Jumlah laporan",
                            data: reportCounts,
                            backgroundColor: "rgba(37, 99, 235, 0.72)",
                            borderColor: "rgba(37, 99, 235, 1)",
                            borderWidth: 1,
                            borderRadius: 6,
                            maxBarThickness: 58
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return (
                                        context.dataset.label +
                                        ": " +
                                        formatNumber(context.raw)
                                    );
                                }
                            }
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true,

                            ticks: {
                                precision: 0,
                                callback: function (value) {
                                    return formatNumber(value);
                                }
                            },

                            title: {
                                display: true,
                                text: "Jumlah laporan"
                            }
                        },

                        x: {
                            ticks: {
                                autoSkip: false
                            },

                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );
    }

    // ==========================================
    // GRAFIK 2: JUMLAH UNIT RUSAK PER CLUSTER
    // ==========================================

    const damagedContainer = getElement(
        "damagedUnitsChartContainer"
    );

    const damagedCanvas = getElement(
        "damagedUnitsByClusterChart"
    );

    const showDamageChart =
        selectedSource === "all" ||
        selectedSource === "damage";

    if (damagedContainer) {
        damagedContainer.classList.toggle(
            "d-none",
            !showDamageChart
        );
    }

    // Hilangkan grafik unit rusak jika sumber hanya keluhan.
    if (!showDamageChart) {
        if (damagedUnitsByClusterChartInstance) {
            damagedUnitsByClusterChartInstance.destroy();
            damagedUnitsByClusterChartInstance = null;
        }

        return;
    }

    if (damagedCanvas) {
        if (damagedUnitsByClusterChartInstance) {
            damagedUnitsByClusterChartInstance.destroy();
            damagedUnitsByClusterChartInstance = null;
        }

        const damagedCounts = groups.map(group => {
            return Number(group.total_damaged_units || 0);
        });

        damagedUnitsByClusterChartInstance = new Chart(
            damagedCanvas,
            {
                type: "bar",

                data: {
                    labels: labels,

                    datasets: [
                        {
                            label: "Unit rusak",
                            data: damagedCounts,
                            backgroundColor: "rgba(220, 53, 69, 0.72)",
                            borderColor: "rgba(220, 53, 69, 1)",
                            borderWidth: 1,
                            borderRadius: 6,
                            maxBarThickness: 58
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return (
                                        context.dataset.label +
                                        ": " +
                                        formatNumber(context.raw)
                                    );
                                }
                            }
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true,

                            ticks: {
                                precision: 0,
                                callback: function (value) {
                                    return formatNumber(value);
                                }
                            },

                            title: {
                                display: true,
                                text: "Jumlah unit rusak"
                            }
                        },

                        x: {
                            ticks: {
                                autoSkip: false
                            },

                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );
    }
}

/**
 * Menampilkan hasil clustering dan grafik.
 */
function renderAnalysis(data, selectedSource) {
    const results = getElement("clusterResults");

    if (!results) return;

    const groups = Array.isArray(data.groups)
        ? data.groups
        : [];

    renderStatistics(data);

    // Perbarui grafik berdasarkan hasil API.
    renderCharts(data, selectedSource);

    results.replaceChildren();

    if (groups.length === 0) {
        const emptyColumn = createElement(
            "div",
            "col-12"
        );

        const emptyCard = createElement(
            "div",
            "analysis-card text-center text-secondary"
        );

        emptyCard.appendChild(
            createElement(
                "i",
                "bi bi-inbox fs-1"
            )
        );

        emptyCard.appendChild(
            createElement(
                "p",
                "mb-0 mt-2",
                "Belum ada teks laporan yang bisa dianalisis."
            )
        );

        emptyColumn.appendChild(emptyCard);
        results.appendChild(emptyColumn);

        return;
    }

    groups.forEach(group => {
        results.appendChild(
            renderClusterCard(
                group,
                selectedSource
            )
        );
    });
}

/**
 * Menampilkan pesan error pada area hasil.
 */
function renderAnalysisError(message) {
    const results = getElement("clusterResults");

    if (!results) return;

    results.replaceChildren();

    const column = createElement(
        "div",
        "col-12"
    );

    const card = createElement(
        "div",
        "analysis-card text-danger"
    );

    card.appendChild(
        createElement(
            "div",
            "fw-bold mb-2",
            "Analisis gagal"
        )
    );

    card.appendChild(
        createElement(
            "div",
            "",
            message
        )
    );

    column.appendChild(card);
    results.appendChild(column);
}

/**
 * Memanggil endpoint analisis teks.
 *
 * Tidak melakukan redirect.
 * Tidak me-refresh halaman.
 */
async function loadTextAnalysis() {
    const sourceFilter = getElement("sourceFilter");
    const clusterCount = getElement("clusterCount");

    if (!sourceFilter || !clusterCount) {
        console.error(
            "Elemen sourceFilter atau clusterCount tidak ditemukan."
        );

        showAnalysisMessage(
            "Filter analisis tidak ditemukan pada halaman.",
            "danger"
        );

        return;
    }

    const source = sourceFilter.value || "all";
    const clusters = clusterCount.value || "3";

    const params = new URLSearchParams({
        source: source,
        clusters: clusters
    });

    setAnalyzeButtonLoading(true);
    hideAnalysisMessage();

    const results = getElement("clusterResults");

    // Tampilkan indikator loading.
    if (results) {
        results.replaceChildren();

        const loadingColumn = createElement(
            "div",
            "col-12"
        );

        const loadingCard = createElement(
            "div",
            "analysis-card text-center text-secondary"
        );

        loadingCard.appendChild(
            createElement(
                "div",
                "spinner-border text-primary mb-3"
            )
        );

        loadingCard.appendChild(
            createElement(
                "p",
                "mb-0",
                "Sedang menganalisis teks laporan..."
            )
        );

        loadingColumn.appendChild(loadingCard);
        results.appendChild(loadingColumn);
    }

    try {
        console.log(
            "Memulai analisis teks:",
            {
                source: source,
                clusters: clusters
            }
        );

        const response = await fetch(
            `${TEXT_ANALYSIS_API}?${params.toString()}`,
            {
                method: "GET",
                credentials: "include",

                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const responseText = await response.text();

        let result;

        try {
            result = responseText
                ? JSON.parse(responseText)
                : {};
        } catch {
            throw new Error(
                "Server mengembalikan respons bukan JSON. " +
                `HTTP ${response.status}.`
            );
        }

        if (!response.ok) {
            const detail = result.detail
                ? `: ${result.detail}`
                : "";

            throw new Error(
                `${result.message || "Permintaan analisis gagal"} ` +
                `(HTTP ${response.status})${detail}`
            );
        }

        // Mendukung respons dengan atau tanpa pembungkus data.
        const data = result.data ?? result;

        if (!Array.isArray(data.groups)) {
            throw new Error(
                "Format respons API tidak sesuai. " +
                "Properti groups tidak ditemukan."
            );
        }

        renderAnalysis(data, source);

        showAnalysisMessage(
            `Analisis berhasil. ${
                formatNumber(data.total_reports)
            } laporan diproses.`,
            "success"
        );

        console.log(
            "Hasil analisis teks:",
            data
        );

    } catch (error) {
        console.error(
            "Analisis teks gagal:",
            error
        );

        const errorMessage =
            error.message ||
            "Gagal melakukan analisis teks.";

        renderAnalysisError(errorMessage);

        showAnalysisMessage(
            errorMessage,
            "danger"
        );

    } finally {
        setAnalyzeButtonLoading(false);
    }
}

/**
 * Inisialisasi halaman.
 */
function initializeTextAnalysis() {
    const form = getElement("analysisForm");
    const button = getElement("analyzeButton");

    if (!form || !button) {
        console.error(
            "Form analysisForm atau tombol analyzeButton tidak ditemukan."
        );

        return;
    }

    // Mencegah listener dipasang dua kali.
    if (form.dataset.analysisInitialized === "true") {
        return;
    }

    form.dataset.analysisInitialized = "true";

    // Cegah form melakukan submit dan berpindah URL.
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();
    });

    // Analisis hanya dijalankan ketika tombol diklik.
    button.addEventListener("click", function (event) {
        event.preventDefault();

        console.log("Tombol Analisis diklik.");

        loadTextAnalysis();
    });

    // Jalankan analisis ketika halaman pertama kali dibuka.
    loadTextAnalysis();
}

/**
 * Jalankan inisialisasi setelah HTML siap.
 */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTextAnalysis,
        { once: true }
    );
} else {
    initializeTextAnalysis();
}