package asset

import (
	"fmt"
	"strings"

	"strconv"
	"time"

	"project-test/ui"
	"project-test/helper"
	"project-test/io"
	"project-test/model"
)


var dummy string


/**************************************************\
* HELPER
*
***************************************************/

func formatCategories(categories []model.Category) string {
	names := make([]string, len(categories))
	for i, c := range categories {
		names[i] = c.NameCategory
	}
	return strings.Join(names, ", ")
}

func formatLocations(locations []model.Location) string {
	names := make([]string, len(locations))
	for i, l := range locations {
		names[i] = l.NamaLocation
	}
	return strings.Join(names, ", ")
}


/**************************************************\
* asset"
*
***************************************************/

func ShowAsset() {
	assets := io.ReadAsset()
	width_start := 2
	i := 3

	fmt.Print(ui.HOME + ui.BG_CYAN + ui.BLACK)
	fmt.Printf("\x1b[%d;%dH", i, width_start)
	fmt.Printf("%-4s", "ID")
	fmt.Printf("%-12s", "Kode")
	fmt.Printf("%-30s", "Nama")
	fmt.Printf("%-20s", "Kategori")
	fmt.Printf("%-20s", "Lokasi")
	fmt.Printf("%-10s", "Kondisi")
	fmt.Printf("%-10s", "Status")
	fmt.Printf("%-4s", "In")
	fmt.Printf("%-4s", "Out")
	fmt.Printf("%-4s", "Real ")
	fmt.Print(ui.RESET)
	i++

	for _, current := range assets {

		if !current.Status {
			fmt.Print(ui.RED)
		}
		fmt.Printf("\x1b[%d;%dH", i, width_start)
		fmt.Printf("%-4d", current.AsetID)
		fmt.Printf("%-12s", current.CodeAset)
		fmt.Printf("%-30s", current.NameAsset)
		fmt.Printf("%-20s", formatCategories(current.Categorys))
		fmt.Printf("%-20s", formatLocations(current.Locations))
		fmt.Printf("%-10s", current.Condition)
		if current.Status {
			fmt.Printf("%-10s", "Aktif")
		} else {
			fmt.Printf("%-10s", "non")
		}
		fmt.Printf("%-4d", current.QtyIn)
		fmt.Printf("%-4d", current.QtyOut)
		fmt.Printf("%-4d", current.QtyReal)
		fmt.Print(ui.RESET)
		i++
	}
}

func AddAsset() {

	fmt.Print(ui.CLEAR)
	ui.PrintTable()
	ui.PrintAssetsMenu()

	assets := io.ReadAsset()
	width_start := 5
	i := 3 //malas nulis height_start++ trus yahahaa
	
	fmt.Printf("\x1b[%d;%dHKode aset: ", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dHNama aset:", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dHKondisi:", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dHDeskripsi:", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dHQty in: ", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dHQty out:", i, width_start)
	i++

	codeAset := input.Input("\x1b[3;16H")
	nameAsset := input.Input("\x1b[4;16H")
	condition := input.Input("\x1b[5;16H")
	description := input.Input("\x1b[6;16H")
	qtyIn := input.InputInt("\x1b[7;16H")
	qtyOut := input.InputInt("\x1b[8;16H")

	fmt.Printf("\x1b[%d;%dHApakah anda ingin menambahkan data kategori dan lokasi juga?", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH(Y/n): ", i, width_start)
	input_pil := input.Input("")

	var (
		categoryID int
		categoryName string
		locationID int
		locationName string
		jenis string
	)
	if input_pil == "Y" || input_pil == "y" {
	categoryID = input.InputInt("ID Kategori: ")
	categoryName = input.Input("Nama Kategori: ")

	locationID = input.InputInt("ID Lokasi: ")
	locationName = input.Input("Nama Lokasi: ")
	jenis = input.Input("Jenis Lokasi: ")


	} else {
		categoryID = 0
		categoryName = "-"
		locationID = 0
		locationName = "-"
		jenis = ""
	}



	id := 1
	if len(assets) > 0 {
		id = assets[len(assets)-1].AsetID + 1
	}

	assets = append(assets, model.Asset{
		AsetID:      id,
		CodeAset:    codeAset,
		NameAsset:   nameAsset,
		Categorys: []model.Category{
			{CategoryID: categoryID, NameCategory: categoryName},
		},
		Locations: []model.Location{
			{LocationID: locationID, NamaLocation: locationName, Jenis: jenis},
		},
		Condition:   condition,
		Status:      true,
		Description: description,
		QtyIn:       qtyIn,
		QtyOut:      qtyOut,
		QtyReal:     qtyIn - qtyOut,
		UpdateAt:    time.Now(),
	})
	io.WriteAsset(assets)
	fmt.Println("Data ditambahkan")
}

func UpdateAsset(){
	asset := io.ReadAsset()

	fmt.Print(ui.CLEAR)
	ui.PrintTable()
	ui.PrintAssetsMenu()

	width_start := 5
	y := 3 

	fmt.Printf("\x1b[%d;%dHKode aset: ", y, width_start)
	y++
//	i = 0 //bruh 
	asetID := input.InputInt("")
	for i, a := range asset {
		if a.AsetID == asetID {

			fmt.Printf("\x1b[%d;%dHApakah aset %s (Y/n): ", y, width_start, a.NameAsset)
			char := input.Input("")
			if char == "Y" || char == "y" {
						print(ui.CLEAR + ui.HOME) // ntr aja lah
						codeAset := input.Input("Kode aset yang diubah: ")
						nameAsset := input.Input("Nama aset yang diubah: ")

						catID := input.InputInt("Kategori ID yang diubah: ") // Note: khusus tipe data Struct >1 tipe data update dengan cara berikut
						nameCat := input.Input("Kategori yang diubah: ")
						categories := model.Category{
							CategoryID:   catID,
							NameCategory: nameCat,
						}

						locID := input.InputInt("Lokasi ID yang diubah: ") // Note: khusus tipe data Struct >1 tipe data update dengan cara berikut
						nameLoc := input.Input("Nama Lokasi yang diubah: ")
						typeLoc := input.Input("Jenis Lokasi yang diubah: ")
						locations := model.Location{
							LocationID:   locID,
							NamaLocation: nameLoc,
							Jenis:        typeLoc,
						}

					condition := input.Input("Kondisi yang diubah: ")

					inputStatus := input.Input("Status yang diubah (true/false): ") // Note: khusus tipe data Bool update ke
					status, _ := strconv.ParseBool(inputStatus)

					description := input.Input("Deskripsi yang diubah: ")
					qtyIn := input.InputInt("QtyIn yang diubah: ")
					qtyOut := input.InputInt("QtyOut yang diubah: ")
					qtyReal := input.InputInt("QtyReal yang diubah: ")
					updateAt := time.Now() // Note: khusus tipe data time.Time update ke waktu sekarang

						asset[i] = model.Asset{asetID, codeAset, nameAsset, []model.Category{categories}, []model.Location{locations}, condition, status, description, qtyIn, qtyOut, qtyReal, updateAt}
					io.WriteAsset(asset)
					fmt.Println("Data berhasil diubah!")
					return

			} else {return}

		} else {
			fmt.Println("Data tidak ditemukan")
			return
		}
	}





}
func DeleteAsset() {

	assets := io.ReadAsset()

	if assets == nil {
		return
	}

	fmt.Print(ui.CLEAR + ui.HOME)//ntr lah

	id := input.InputInt("Masukkan ID aset yang akan dihapus: ")

	for i, asset := range assets {

		if asset.AsetID == id {

			fmt.Println("\n======= ASSET DITEMUKAN =======")
			fmt.Println("ID   :", asset.AsetID)
			fmt.Println("Kode :", asset.CodeAset)
			fmt.Println("Nama :", asset.NameAsset)

			confirm := input.Input("Yakin ingin menghapus? (y/n): ")

			if strings.ToLower(confirm) != "y" {
				fmt.Println("Penghapusan dibatalkan.")
				return
			}

			assets = append(assets[:i], assets[i+1:]...)

			io.WriteAsset(assets)

			fmt.Println("Asset berhasil dihapus.")
			fmt.Scanln(&dummy)
			return
		}
	}

	fmt.Println("Asset dengan ID", id, "tidak ditemukan.")
	fmt.Scanln(&dummy)
}


