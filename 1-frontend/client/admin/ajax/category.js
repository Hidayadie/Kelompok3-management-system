// untuk select2
    const API_BASE ="http://localhost:8080/api/private/categories";
    
    $(document).ready(function () {
        const API_URL =
        "http://localhost:8080/api/private/categories";
        
        const $tableBody = $("#categoryTableBody");
        const $alert = $("#categoryAlert");
        const $filter = $("#categoryFilter");
        const $refresh = $("#refreshCategories");
        const $count = $("#categoryCount");

        let categories = [];

    // Inisialisasi Select2 dengan tema Bootstrap 5.
        $filter.select2({
            theme: "bootstrap-5",
            width: "100%",
            placeholder: "Cari nama kategori...",
            allowClear: true
        });
        
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

            if (Number.isNaN(date.getTime())) {
                return value;
            }
            
            return date.toLocaleString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jakarta"
            });
        }
        
        function renderTable() {
            const selectedId = $filter.val();
            
            const filtered = selectedId
            ? categories.filter(
                item => String(item.id) === String(selectedId)
                )
            : categories;
            
            $tableBody.empty();
            
            if (filtered.length === 0) {
                $tableBody.append(`
                <tr>
                    <td colspan="4"
                        class="text-center text-muted py-4">
                        Tidak ada data kategori.
                    </td>
                </tr>
                `);
                
                $count.text("Total: 0 kategori");
                return;
            }
            
            filtered.forEach(function (item, index) {
                const $row = $("<tr>");
                
                $("<td>")
                .text(index + 1)
                .appendTo($row);
                
                $("<td>")
                .text(item.name ?? "-")
                .appendTo($row);
                
                $("<td>")
                .text(formatDate(item.created_at))
                .appendTo($row);
                
                const $actionCell = $("<td>");

// Tombol Ubah
                const $editButton = $("<button>", {
                    type: "button",
                    class: "btn btn-warning btn-sm btn-edit-category me-1",
                    title: "Ubah kategori"
                })
                .attr("data-id", item.id)
                .html('<i class="bi bi-pencil-square me-1"></i>Ubah');

// Tombol Hapus
                const $deleteButton = $("<button>", {
                    type: "button",
                    class: "btn btn-danger btn-sm btn-delete-category",
                    title: "Hapus kategori"
                })
                .attr("data-id", item.id)
                .attr("data-name", item.name)
                .html('<i class="bi bi-trash me-1"></i>Hapus');

// Masukkan kedua tombol ke kolom Aksi
                $actionCell.append($editButton, $deleteButton);
                $row.append($actionCell);
                
                
                $tableBody.append($row);
            });
            
            $count.text(
        `Menampilkan ${filtered.length} dari ${categories.length} kategori`
        );
        }

        function loadCategories() {
            $refresh.prop("disabled", true);

            $tableBody.html(`
            <tr>
                <td colspan="4" class="text-center py-4">
                    <span class="spinner-border spinner-border-sm
                                 text-primary me-2"></span>
                    Memuat data kategori...
                </td>
            </tr>
            `);

            hideAlert();
        
        // AJAX GET ke API kategori.
            $.ajax({
                url: API_URL,
                method: "GET",
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                },
                headers: {
                    "Accept": "application/json"
                },
                cache: false,

                success: function (response) {
                    if (!response ||
                        !Array.isArray(response.data)) {

                        showAlert(
                            "Format respons API tidak sesuai.",
                            "danger"
                            );

                    $tableBody.html(`
                        <tr>
                            <td colspan="4"
                                class="text-center py-4">
                                Format data tidak valid.
                            </td>
                        </tr>
                    `);

                    return;
                }

                categories = response.data;

                // Isi ulang dropdown Select2.
                $filter.empty();
                
                $filter.append(
                    new Option("Semua Kategori", "", true, true)
                    );
                
                categories.forEach(function (item) {
                    $filter.append(
                        new Option(
                            item.name ?? "Tanpa nama",
                            String(item.id)
                            )
                        );
                });
                
                $filter.val("").trigger("change.select2");
                
                renderTable();
                
                if (categories.length === 0) {
                    showAlert(
                        "Belum ada kategori yang terdaftar.",
                        "warning"
                        );
                }
            },
            
            error: function (xhr, status, error) {
                console.error(
                    "AJAX kategori gagal:",
                    xhr.status,
                    status,
                    error,
                    xhr.responseText
                    );
                
                let message = "Gagal memuat data kategori.";
                
                if (xhr.status === 401 || xhr.status === 403) {
                    message =
                    "Akses ditolak. Silakan login kembali.";
                } else if (xhr.status === 404) {
                    message =
                    "Endpoint kategori tidak ditemukan.";
                } else if (status === "parsererror") {
                    message =
                    "Respons API bukan JSON yang valid.";
                } else if (xhr.status === 0) {
                    message =
                    "Tidak dapat mengakses API. Periksa server dan CORS.";
                }
                
                showAlert(message, "danger");
                
                $tableBody.html(`
                    <tr>
                        <td colspan="4"
                            class="text-center text-danger py-4">
                            Data kategori gagal dimuat.
                        </td>
                    </tr>
                `);
            },
            
            complete: function () {
                $refresh.prop("disabled", false);
            }
        });
        }
    
    // Filter tabel saat pilihan Select2 berubah.
        $filter.on("change", function () {
            renderTable();
        });
        
    // Muat ulang data melalui AJAX.
        $refresh.on("click", function () {
            loadCategories();
        });
        
    // Panggilan pertama saat halaman dibuka.
        loadCategories();
    });

//batas select2


//AJAX click edit dan  menampilkan data category pada modal


$(document).on("click", ".btn-edit-category", function () {
    const id = $(this).attr("data-id");

    console.log("Tombol Edit diklik, ID:", id);

    if (!id) {
        Swal.fire("Error", "ID kategori tidak ditemukan.", "error");
        return;
    }

    $.ajax({
        url: `http://localhost:8080/api/private/categories/${id}`,
        method: "GET",
        dataType: "json",
        xhrFields: {
            withCredentials: true
        },
        headers: {
            Accept: "application/json"
        },

        success: function (response) {
            console.log("Respons GET kategori:", response);

            const category =
            response.data ?? response.category ?? response;

            if (category.id == null || category.name == null) {
                Swal.fire(
                    "Error",
                    "Data kategori tidak ditemukan.",
                    "error"
                    );
                return;
            }

            $("#editCategoryId").val(category.id);
            $("#editCategoryName").val(category.name);

            const modalElement =
            document.getElementById("editCategoryModal");

            if (!modalElement) {
                console.error("Elemen #editCategoryModal tidak ditemukan.");
                return;
            }

            bootstrap.Modal
            .getOrCreateInstance(modalElement)
            .show();
        },

        error: function (xhr) {
            console.error("GET kategori gagal:", xhr.status, xhr.responseText);

            Swal.fire({
                icon: "error",
                title: "Gagal Memuat Kategori",
                text: xhr.responseJSON?.error ||
                `Request gagal dengan HTTP ${xhr.status}.`
            });
        }
    });
});

// batas click button edit dan menmapilkan datakategori

//batas memproses edit
$("#editCategoryForm").on("submit", function (event) {
    event.preventDefault();

    const id = $("#editCategoryId").val();
    const name = $("#editCategoryName").val().trim();

    if (!id || !name) {
        Swal.fire({
            icon: "warning",
            title: "Data belum lengkap",
            text: "Nama kategori wajib diisi."
        });
        return;
    }

    $.ajax({
        url: `http://localhost:8080/api/private/categories/${encodeURIComponent(id)}`,
        method: "PUT",
        contentType: "application/json",
        dataType: "json",

        xhrFields: {
            withCredentials: true
        },

        headers: {
            "Accept": "application/json"
        },

        data: JSON.stringify({
            name: name
        }),

        success: function (response) {
            Swal.fire({
                icon: "success",
                title: "Berhasil!",
                text: response.message ||
                "Kategori berhasil diperbarui.",
                confirmButtonText: "OK",
                allowOutsideClick: false
            }).then(function () {
                window.location.reload();
            });
        },

        error: function (xhr) {
            const response = xhr.responseJSON || {};
            
            Swal.fire({
                icon: "error",
                title: "Gagal Memperbarui!",
                text: response.message ||
                response.error ||
                `Gagal memperbarui kategori (HTTP ${xhr.status}).`,
                confirmButtonText: "Coba Lagi"
            });
        }
    });
});
// batas proses edit 


// proses tambah category di endpoint


$("#addCategoryForm").on("submit", function (event) {
    event.preventDefault();

    const $form = $(this);
    const $button = $("#saveCategoryButton");
    const modalElement = document.getElementById("addCategoryModal");

    const name = $("#categoryName").val().trim();

    // Validasi input
    if (!name) {
        Swal.fire({
            icon: "warning",
            title: "Nama kategori wajib diisi!",
            text: "Silakan masukkan nama kategori terlebih dahulu.",
            confirmButtonText: "OK",
            confirmButtonColor: "#2563eb"
        });
        return;
    }

    // Cegah pengiriman berulang
    if ($button.prop("disabled")) {
        return;
    }

    $button.prop("disabled", true).html(`
        <span class="spinner-border spinner-border-sm me-1"></span>
        Menyimpan...
    `);

    $.ajax({
        url: API_BASE,
        method: "POST",
        contentType: "application/json",
        dataType: "json",

        xhrFields: {
            withCredentials: true
        },

        headers: {
            "Accept": "application/json"
        },

        data: JSON.stringify({
            name: name
        }),

        // BERHASIL MENAMBAHKAN KATEGORI
        success: function (response) {
            Swal.fire({
                icon: "success",
                title: "Berhasil!",
                text: response.message ||
                response.data?.message ||
                "Kategori berhasil ditambahkan.",
                confirmButtonText: "OK",
                confirmButtonColor: "#2563eb",
                allowOutsideClick: false
            }).then(function () {
                // Tutup modal Bootstrap
                const modalInstance =
                bootstrap.Modal.getOrCreateInstance(modalElement);

                // Reload setelah modal benar-benar tertutup
                modalElement.addEventListener(
                    "hidden.bs.modal",
                    function () {
                        window.location.reload();
                    },
                    { once: true }
                    );

                modalInstance.hide();
                $form[0].reset();
            });
        },

        // GAGAL MENAMBAHKAN KATEGORI
        error: function (xhr) {
            console.error(
                "Gagal menambahkan kategori:",
                xhr.status,
                xhr.responseText
                );

            const response = xhr.responseJSON || {};

            let message =
            response.message ||
            response.error ||
            response.data?.message ||
            response.data?.error ||
            "Kategori gagal ditambahkan. Silakan coba lagi.";
            
            if (xhr.status === 0) {
                message =
                "Tidak dapat terhubung ke server. Periksa koneksi API.";
            } else if (xhr.status === 400) {
                message =
                response.message ||
                response.error ||
                "Data kategori tidak valid.";
            } else if (xhr.status === 401 || xhr.status === 403) {
                message =
                response.message ||
                response.error ||
                "Sesi berakhir atau akses ditolak.";
            } else if (xhr.status === 404) {
                message =
                response.message ||
                response.error ||
                "Endpoint kategori tidak ditemukan.";
            } else if (xhr.status === 409) {
                message =
                response.message ||
                response.error ||
                "Nama kategori sudah digunakan.";
            }

            Swal.fire({
                icon: "error",
                title: "Gagal Menyimpan!",
                text: message,
                confirmButtonText: "Coba Lagi",
                confirmButtonColor: "#dc3545"
            });

            // Modal tetap terbuka jika gagal.
        },

        // AKTIFKAN KEMBALI TOMBOL SIMPAN
        complete: function () {
            $button.prop("disabled", false).html(`
                <i class="bi bi-save me-1"></i>
                Simpan Kategori
            `);
        }
    });
});



//batas endpoint tambah category
document.getElementById("logoutButton").addEventListener("click", async function (event) {
    event.preventDefault();
    
    const button = this;
    button.style.pointerEvents = "none";
    
    try {
        const response = await fetch("http://localhost:8080/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        
        if (!response.ok) {
            console.error("Logout gagal:", await response.text());
        }
    } catch (error) {
        console.error("Gagal menghubungi server logout:", error);
    } finally {
        // Tetap arahkan ke login meskipun request mengalami kegagalan.
        window.location.replace("/login.html");
    }
});


//proses hapus kategori
$(document).on("click", ".btn-delete-category", async function () {
    const id = $(this).attr("data-id");
    const name = $(this).attr("data-name") || "kategori ini";

    // Konfirmasi hapus
    const confirm = await Swal.fire({
        title: "Hapus Category?",
        text: `Apakah kamu yakin ingin menghapus "${name}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Batal"
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({
            title: "Menghapus...",
            text: "Mohon tunggu sebentar.",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch(
            `http://localhost:8080/api/private/categories/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            let message = `Gagal menghapus category (HTTP ${response.status}).`;

            try {
                const result = await response.json();
                message = result.error || result.message || message;
            } catch (_) {}

            throw new Error(message);
        }

        await Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: "Category berhasil dihapus.",
            timer: 1800,
            showConfirmButton: false
        });

        // Muat ulang data tabel
        if (typeof loadCategories === "function") {
            await loadCategories();
        } else {
            location.reload();
        }

    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Gagal!",
            text: error.message || "Terjadi kesalahan saat menghapus category."
        });
    }
});
// batas proses hapus kategori



(async function checkLogin() {
    const API_URL = "http://localhost:8080";
    const LOGIN_URL = "http://localhost:8081/login.html";

    try {
        const response = await fetch(`${API_URL}/api/me`, {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        // Belum login atau sesi tidak valid.
        if (!response.ok) {
            window.location.replace(LOGIN_URL);
            return;
        }

        // Pastikan respons bisa dibaca.
        const result = await response.json();
        const user = result.data || result.user;

        if (!user || !user.role) {
            window.location.replace(LOGIN_URL);
            return;
        }

        // Opsional: simpan data pengguna untuk digunakan halaman.
        window.currentUser = user;

    } catch (error) {
        console.error("Gagal memeriksa autentikasi:", error);
        
        // Jika server tidak bisa diverifikasi, jangan izinkan
        // halaman tetap terbuka.
        window.location.replace(LOGIN_URL);
    }
})();