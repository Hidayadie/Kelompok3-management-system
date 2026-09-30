package io

import (
	"encoding/json"
	"log"
	"os"

	"project-test/model"

)


func ReadAsset() []model.Asset {
	file, err := os.Open(model.JsonFileAssets)
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	var assets []model.Asset
	if err := json.NewDecoder(file).Decode(&assets); err != nil {
		log.Fatal(err)
	}
	return assets
}

//func writeUser(users []User) {}
func WriteAsset(assets []model.Asset) {
	file, err := os.Create(model.JsonFileAssets)
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(assets); err != nil {
		log.Fatal(err)
	}
}

