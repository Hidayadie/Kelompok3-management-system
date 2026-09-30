package main

import (
	"fmt"

	"project-test/helper"
	"project-test/ui"
	"project-test/asset"

)
var jsonFileUser = "data/user.json"
//var jsonFileComplaint = "data/students.json"

var dummy string

  

func main() {

	ui.PrintFirstTime()
	
	fmt.Printf("\x1b[%d;%dH", 3, 5)
	fmt.Printf(ui.BOLD+"SELAMAT DATANG"+ui.RESET)

	fmt.Printf("\x1b[%d;%dH", 4, 5)
	fmt.Printf("Silahkan pilih menu disebelah kanan untuk melanjutkan...")

	for {

		ui.PrintTable()
		ui.PrintMainMenu()
		fmt.Printf("\x1b[%d;%dH-> ", 20, 130)

		ui.PrintFirstTime()
		menu := input.InputInt("")

		switch menu {
		case 1:
		menuAsetLoop:
			for {
				fmt.Print(ui.CLEAR)
				ui.PrintTable()
				ui.PrintAssetsMenu()

				asset.ShowAsset()
				fmt.Printf("\x1b[%d;%dH-> ", 15, 130)
				submenu := input.InputInt("")

				switch submenu {
				case 1:
					asset.AddAsset()
				case 2:
				case 3:
					asset.UpdateAsset()
				case 4:
					asset.DeleteAsset()
				case 0:
					fmt.Print(ui.CLEAR)
					break menuAsetLoop

				default:
					fmt.Println("Menu tidak valid")
				}
			}//for
			//fmt.Scanln(&dummy)
		case 2:
			//addAsset()
		case 3:
		case 4:
		case 5:
		case 0:
			return
		default:
			fmt.Println("Menu tidak valid")
		}
	}

}


func findUser() {}
func showComplaint() {}



/*
func input(label string) string {
	// Catatan: helper ini dipakai supaya input seperti nama bisa memakai spasi.
	fmt.Print(label)
	text, _ := reader.ReadString('\n')
	return strings.TrimSpace(text)
}

func inputInt(label string) int {
	value, _ := strconv.Atoi(input(label))
	return value
}*/



