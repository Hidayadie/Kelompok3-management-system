// main.go cuman jadi entry point, go run -> panggil fungsi main
// main func -> buat runtime database + buat struct server
// run server (listen and serve)

package main

import (
	"log"
	"net/http"
	"time"

	"project-test/handler"
	"project-test/store"
)

const addr = ":2100"

func main() {
	// load database
	st, err := store.New(store.Paths{
		Complaints: "data/complaints.json",
		Users:      "data/users.json",
		Assets:     "data/assets.json",
	})
	if err != nil {
		log.Fatal(err)
	}

	// create server & sifatnya
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler.New(st),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("server listening on", addr)
	// start server/web
	log.Fatal(srv.ListenAndServe())
}

