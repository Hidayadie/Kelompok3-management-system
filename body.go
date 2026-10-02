package main

import (
	"html/template"
)

var bodyTemplate = template.Must(template.New("body").Parse(`

<main>

<header>
{{if eq .Mode "showComplaint"}}
	<h1>{{.Title}}</h1>

	<p>
		<a class="btn" href="/complaints/new">
			+ Tambah Pengaduan
		</a>
	</p>

	{{else if eq .Mode "detailComplaint"}}

	<p>
		<a href="/complaints">
			Kembali ke daftar pengaduan
		</a>
	</p>

	{{end}}
</header>


{{if eq .Mode "showComplaint"}}

<section>

<table>

	<thead>
		<tr>
			<th>AsetID</th>
			<th>Kode</th>
			<th>User ID</th>
			<th>Asset ID</th>
			<th>Judul</th>
			<th>Deskripsi</th>
			<th>Prioritas</th>
			<th>Status</th>
			<th>Catatan</th>
			<th>Aksi</th>
		</tr>
	</thead>

	<tbody>

	{{range .Complaints}}

	<tr>
		<td>{{.ID}}</td>
		<td>{{.Code}}</td>
		<td>{{.UserID}}</td>
		<td>{{.AssetID}}</td>

		<td>
			<a href="/complaints/{{.ID}}">
				{{.Title}}
			</a>
		</td>

		<td>{{.Description}}</td>
		<td>{{.Priority}}</td>
		<td>{{.Status}}</td>
		<td>{{.Note}}</td>

		<td class="row-actions">

			<a
				class="btn btn-sm btn-warn"
				href="/complaints/{{.ID}}/edit">
				Edit
			</a>

			<form
				class="inline"
				method="post"
				action="/complaints/{{.ID}}/delete">

				<button
					class="btn btn-sm btn-danger"
					type="submit">
					Hapus
				</button>

			</form>

		</td>
	</tr>

	{{else}}

	<tr>
		<td colspan="10">
			Belum ada pengaduan.
		</td>
	</tr>

	{{end}}

	</tbody>

</table>

</section>


{{else if eq .Mode "form"}}

{{if .Error}}
	<p class="error">{{.Error}}</p>
{{end}}

<form method="post" action="{{.Action}}">

	<label for="userID">User</label>

	<select id="userID" name="userID" required>

		<option value="">
			-- Pilih user --
		</option>

		{{range .Users}}

		<option
			value="{{.ID}}"
			{{if eq (printf "%d" .ID) $.Form.UserID}}
			selected
			{{end}}>

			{{.ID}} - {{.Name}}

		</option>

		{{end}}

	</select>


	<label for="assetID">Asset</label>

	<select id="assetID" name="assetID" required>

		<option value="">
			-- Pilih asset --
		</option>

		{{range .Assets}}

		<option
			value="{{.AsetID}}"
			{{if eq (printf "%d" .AsetID) $.Form.AssetID}}
			selected
			{{end}}>

			{{.CodeAset}} - {{.NameAsset}}

		</option>

		{{end}}

	</select>


	<label for="title">Judul</label>

	<input
		id="title"
		name="title"
		type="text"
		required
		value="{{.Form.Title}}">


	<label for="description">Deskripsi</label>

	<textarea
		id="description"
		name="description"
		rows="4"
		required>{{.Form.Description}}</textarea>


	<label for="priority">Prioritas</label>

	<input
		id="priority"
		name="priority"
		type="number"
		min="0"
		step="any"
		required
		value="{{.Form.Priority}}">


	<label for="status">Status</label>

	<select id="status" name="status">

		<option value="urgent"
			{{if eq .Form.Status "urgent"}}selected{{end}}>
			Urgent
		</option>

		<option value="midle"
			{{if eq .Form.Status "midle"}}selected{{end}}>
			Midle
		</option>

		<option value="low"
			{{if eq .Form.Status "low"}}selected{{end}}>
			Low
		</option>

	</select>


	<label for="note">
		Catatan (opsional)
	</label>

	<textarea
		id="note"
		name="note"
		rows="2">{{.Form.Note}}</textarea>


	<div class="actions">

		<button class="btn" type="submit">

			{{if .IsEdit}}
				Simpan Perubahan
			{{else}}
				Simpan
			{{end}}

		</button>

	</div>

</form>

{{else if eq .Mode "showAsset"}}


	<section>

<table>

	<thead>
		<tr>
			<th>ID</th>
			<th>Kode Asset</th>
			<th>Nama Asset</th>
			<th>Kategori</th>
			<th>Lokasi</th>
			<th>Kondisi</th>
			<th>Status</th>
			<th>Description</th>
			<th>Quantity In</th>
			<th>Queantity Out</th>
			<th>Quantity Awal</th>
			<th>Action</th>
		</tr>
	</thead>

	<tbody>

	{{range .Assets}}
	<tr>
		<td>{{.AsetID}}</td>
		<td>{{.CodeAset}}</td>
		<td>{{.NameAsset}}</td>
		<td>{{.Categorys}}</td>
		<td>{{.Locations}}</td>
		<td>{{.Condition}}</td>
		<td>{{.Status}}</td>
		<td>{{.Description}}</td>
		<td>{{.QtyIn}}</td>
		<td>{{.QtyOut}}</td>
		<td>{{.QtyReal}}</td>
		<td class="row-actions">

			<a
				class="btn btn-sm btn-warn"
				href="/assets/{{.AsetID}}/edit">
				Edit
			</a>

			<form
				class="inline"
				method="post"
				action="/assets/{{.AsetID}}/delete">

				<button
					class="btn btn-sm btn-danger"
					type="submit">
					Hapus
				</button>

			</form>

		</td>
	</tr>

	{{else}}

	<tr>
		<td colspan="10">
			Belum ada pengaduan.
		</td>
	</tr>

	{{end}}

	</tbody>

</table>

</section>

{{else if eq .Mode "detailComplaint"}}

<article>

	<p>
		{{.Complaint.Description}}
	</p>

	<table>

		<tr>
			<th>ID</th>
			<td>{{.Complaint.ID}}</td>
		</tr>

		<tr>
			<th>Kode</th>
			<td>{{.Complaint.Code}}</td>
		</tr>

		<tr>
			<th>User ID</th>
			<td>{{.Complaint.UserID}}</td>
		</tr>

		<tr>
			<th>Asset ID</th>
			<td>{{.Complaint.AssetID}}</td>
		</tr>

		<tr>
			<th>Prioritas</th>
			<td>{{.Complaint.Priority}}</td>
		</tr>

		<tr>
			<th>Status</th>
			<td>{{.Complaint.Status}}</td>
		</tr>

		<tr>
			<th>Catatan</th>
			<td>{{.Complaint.Note}}</td>
		</tr>

	</table>

	<div class="actions">

		<a
			class="btn btn-warn"
			href="/complaints/{{.Complaint.ID}}/edit">
			Edit
		</a>

		<form
			class="inline"
			method="post"
			action="/complaints/{{.Complaint.ID}}/delete">

			<button class="btn btn-danger" type="submit">
				Hapus
			</button>

		</form>

	</div>

</article>

{{end}}


</main>

`))
