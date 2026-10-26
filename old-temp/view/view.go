// Package view merender halaman html, templet/css ikut masuk ke binary (go:embed),
package view

import (
	"bytes"
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"
)

//go:embed templates/*.html static/*
var files embed.FS

// Struct page isinya... gitu 
// diakses di template sebagai .Data.NamaField
type Page struct {
	Title  string
	Active string // menu nav yang disorot: home, assets, complaints
	Data   any
}

var funcs = template.FuncMap{
	// title: "urgent" -> "Urgent"
	"title": func(s string) string {
		if s == "" {
			return s
		}
		return strings.ToUpper(s[:1]) + s[1:]
	},
}

// pages: satu template set per halaman (layout.html + halaman itu)
// dipisah supaya {{define "content"}} di tiap halaman tidak saling menimpa
var pages = map[string]*template.Template{}

func init() {
	list, err := fs.Glob(files, "templates/*.html")
	if err != nil {
		panic(err)
	}
	for _, p := range list {
		name := path.Base(p)
		if name == "layout.html" {
			continue
		}
		pages[name] = template.Must(
			template.New(name).Funcs(funcs).ParseFS(files, "templates/layout.html", p),
		)
	}
}

// Static melayani file di folder static/ (alamat: /static/...)
func Static() http.Handler {
	return http.FileServerFS(files)
}

// Render menjalankan template ke buffer dulu. Kalau template gagal di tengah jalan,
// browser tidak menerima halaman setengah jadi, melainkan error 500 yang bersih.
func Render(w http.ResponseWriter, status int, page string, p Page) {
	t, ok := pages[page]
	if !ok {
		log.Println("view: template tidak ditemukan:", page)
		http.Error(w, "template tidak ditemukan", http.StatusInternalServerError)
		return
	}

	var buf bytes.Buffer
	if err := t.ExecuteTemplate(&buf, "layout", p); err != nil {
		log.Printf("view: render %s: %v", page, err)
		http.Error(w, "gagal menampilkan halaman", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	buf.WriteTo(w)
}
