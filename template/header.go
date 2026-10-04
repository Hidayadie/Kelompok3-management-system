package template 

import (
	"html/template"
)

var HeaderTemplate = template.Must(template.New("header").Parse(`
<!doctype html>
<html lang="id">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>{{.Title}}</title>
	
</head>
<style>
	/* ========================================
	   GLOBAL
	======================================== */

	* {
		box-sizing: border-box;
	}

	body {
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		margin: 0;
		color: #222;
		background: #f5f7fb;
	}


	/* ========================================
	   HEADER / NAVBAR
	======================================== */

	header {
		background: #1e3a8a;
		color: white;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
	}

	nav {
		max-width: 1200px;
		min-height: 70px;
		margin: 0 auto;
		padding: 0 24px;

		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 30px;
	}

	nav h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
		white-space: nowrap;
	}

	nav ul {
		display: flex;
		align-items: center;
		gap: 6px;

		margin: 0;
		padding: 0;

		list-style: none;
	}

	nav li {
		margin: 0;
	}

	nav a {
		display: block;

		padding: 10px 14px;

		color: #dbeafe;
		text-decoration: none;

		font-size: 14px;
		font-weight: 500;

		border-radius: 6px;

		transition:
			background-color 0.2s ease,
			color 0.2s ease;
	}

	nav a:hover {
		background: #2563eb;
		color: white;
	}

	nav a.active {
		background: #2563eb;
		color: white;
		font-weight: 600;
	}


	/* ========================================
	   MAIN CONTENT
	======================================== */

	main {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 0 24px;
	}


	/* ========================================
	   TABLE
	======================================== */

	table {
		border-collapse: collapse;
		width: 100%;
		background: white;
	}

	th,
	td {
		border: 1px solid #ccc;
		padding: 8px 10px;
		text-align: left;
		vertical-align: top;
	}

	thead th {
		background: #f0f0f0;
	}

	tbody tr:nth-child(even) {
		background: #fafafa;
	}

	tbody tr:hover {
		background: #eef5ff;
	}

	section {
		overflow-x: auto;
	}


	/* ========================================
	   BUTTON
	======================================== */

	.btn {
		display: inline-block;

		padding: 8px 14px;

		background: #2563eb;
		color: #fff;

		border: 0;
		border-radius: 6px;

		text-decoration: none;
		cursor: pointer;

		font-size: 1rem;

		transition: background 0.2s ease;
	}

	.btn:hover {
		background: #1d4ed8;
	}

	.btn-sm {
		padding: 4px 10px;
		font-size: 0.9rem;
	}

	.btn-danger {
		background: #dc2626;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	.btn-warn {
		background: #d97706;
	}

	.btn-warn:hover {
		background: #b45309;
	}


	/* ========================================
	   FORM
	======================================== */

	form {
		max-width: 560px;
	}

	form.inline {
		display: inline;
	}

	label {
		display: block;
		margin-top: 1rem;
		font-weight: 600;
	}

	input,
	select,
	textarea {
		width: 100%;

		padding: 8px;
		margin-top: 4px;

		border: 1px solid #bbb;
		border-radius: 6px;

		font: inherit;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}


	/* ========================================
	   ERROR
	======================================== */

	.error {
		background: #fee2e2;
		color: #991b1b;

		padding: 10px 12px;

		border-radius: 6px;

		margin-bottom: 1rem;
	}


	/* ========================================
	   ACTION
	======================================== */

	.actions {
		margin-top: 1.5rem;
	}

	.row-actions {
		white-space: nowrap;
	}


	/* ========================================
	   FOOTER
	======================================== */

	footer {
		max-width: 1200px;
		margin: 3rem auto 0;
		padding: 20px 24px;

		color: #666;
		font-size: 14px;
		text-align: center;
	}

	footer hr {
		border: 0;
		border-top: 1px solid #ddd;
		margin-bottom: 15px;
	}


	/* ========================================
	   RESPONSIVE
	======================================== */

	@media (max-width: 850px) {

		nav {
			padding: 15px 20px;

			align-items: flex-start;
			flex-direction: column;

			gap: 12px;
		}

		nav ul {
			width: 100%;
			flex-wrap: wrap;
		}

		nav a {
			padding: 8px 10px;
		}

		main {
			padding: 0 20px;
		}
	}


	@media (max-width: 600px) {

		nav ul {
			display: grid;
			grid-template-columns: 1fr 1fr;
			width: 100%;
		}

		nav a {
			text-align: center;
			background: rgba(255, 255, 255, 0.08);
		}

		main {
			margin-top: 1.5rem;
			padding: 0 15px;
		}
	}
	/* ================================
           HERO / WELCOME
        ================================= */

        .hero {
            max-width: 1200px;
            min-height: 500px;
            margin: 0 auto;
            padding: 80px 24px;

            display: flex;
            align-items: center;
            justify-content: center;

            text-align: center;
        }

        .hero-content {
            max-width: 800px;
        }

        .hero-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 25px;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #dbeafe;
            color: #1e3a8a;
            border-radius: 20px;

            font-size: 38px;
        }

        .hero h1 {
            margin: 0 0 20px;

            font-size: 42px;
            line-height: 1.2;
            color: #1e3a8a;
        }

        .hero p {
            margin: 0 auto 30px;

            max-width: 650px;

            font-size: 18px;
            line-height: 1.7;
            color: #64748b;
        }

        .hero-button {
            display: inline-block;

            padding: 12px 24px;

            background: #2563eb;
            color: white;

            border-radius: 8px;

            text-decoration: none;
            font-weight: 600;

            transition: 0.2s;
        }

        .hero-button:hover {
            background: #1d4ed8;
            transform: translateY(-2px);
        }


        /* ================================
           FEATURE
        ================================= */

        .features {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px 60px;

            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }

        .feature-card {
            padding: 25px;

            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;

            text-align: center;

            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);

            transition: 0.2s;
        }

        .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }

        .feature-icon {
            font-size: 30px;
            margin-bottom: 12px;
        }

        .feature-card h3 {
            margin: 0 0 10px;
            color: #1e3a8a;
        }

        .feature-card p {
            margin: 0;
            color: #64748b;
            line-height: 1.6;
            font-size: 14px;
        }


        /* ================================
           FOOTER
        ================================= */

        footer {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 24px;

            text-align: center;
            color: #64748b;
            font-size: 14px;
        }

        footer hr {
            border: 0;
            border-top: 1px solid #ddd;
            margin-bottom: 15px;
        }


        /* ================================
           RESPONSIVE
        ================================= */

        @media (max-width: 850px) {

            .site-header nav {
                padding: 15px 20px;
                flex-direction: column;
                align-items: flex-start;
                gap: 12px;
            }

            .site-header ul {
                width: 100%;
                flex-wrap: wrap;
            }

            .hero {
                padding: 60px 20px;
            }

            .hero h1 {
                font-size: 34px;
            }

            .features {
                grid-template-columns: 1fr;
                padding: 0 20px 40px;
            }
        }


        @media (max-width: 600px) {

            .site-header ul {
                display: grid;
                grid-template-columns: 1fr 1fr;
            }

            .site-header a {
                text-align: center;
                background: rgba(255, 255, 255, 0.08);
            }

            .hero h1 {
                font-size: 28px;
            }

            .hero p {
                font-size: 16px;
            }
        }
		.btn {
  display: inline-block;
  padding: 10px 18px;
  background: #2563eb;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
}
.btn:hover {
  background: #1d4ed8;
}
</style>
<body>

<header>
	<nav>

		<h2>Manajemen Aset</h2>

		<ul>
			<li>
				<a href="/">
					Home
				</a>
			</li>
			<li>
				<a href="/assets">
					Kelola Aset
				</a>
			</li>

			<li>
				<a href="/categories">
					Kelola Kategori
				</a>
			</li>

			<li>
				<a href="/complaints">
					Kelola Keluhan
				</a>
			</li>

			<li>
				<a href="/loans">
					Kelola Peminjaman Aset
				</a>
			</li>

			<li>
				<a href="/users">
					Kelola User
				</a>
			</li>

		</ul>

	</nav>
</header>
{{if eq .Mode "index"}}
<!-- ================================
         HERO
    ================================= -->

    <main>

        <section class="hero">

            <div class="hero-content">

                <div class="hero-icon">
                    📦
                </div>

                <h1>
                    Selamat Datang di<br>
                    Sistem Manajemen Inventaris dan Keluhan Cerdas
                </h1>

                <p>
                    Sistem terintegrasi untuk membantu mengelola inventaris,
                    peminjaman aset, kategori, pengguna, serta pengaduan
                    secara lebih mudah, cepat, dan terstruktur.
                </p>

                <a href="/assets" class="hero-button">
                    Mulai Kelola Inventaris
                </a>

            </div>

        </section>


        <!-- ================================
             FEATURE
        ================================= -->

        <section class="features">

            <div class="feature-card">

                <div class="feature-icon">
                    📦
                </div>

                <h3>Manajemen Aset</h3>

                <p>
                    Kelola data aset, kategori, lokasi, kondisi,
                    dan status inventaris secara terstruktur.
                </p>

            </div>


            <div class="feature-card">

                <div class="feature-icon">
                    🔧
                </div>

                <h3>Manajemen Keluhan</h3>

                <p>
                    Catat, pantau, dan kelola pengaduan terkait
                    aset maupun layanan secara terorganisir.
                </p>

            </div>


            <div class="feature-card">

                <div class="feature-icon">
                    📊
                </div>

                <h3>Informasi Terintegrasi</h3>

                <p>
                    Menyediakan informasi inventaris dan keluhan
                    dalam satu sistem yang mudah digunakan.
                </p>

            </div>

        </section>

    </main>

{{end}}

`))
