package ui

import (
	"fmt"
)

const ( //color
	RESET   = "\x1b[0m"
	BOLD   = "\x1b[1m"
	BLACK = "\x1b[30m"
	RED     = "\x1b[31m"
	GREEN  = "\x1b[32m"
	YELLOW = "\x1b[33m"
	BLUE = "\x1b[34m"
	MAGENTA = "\x1b[35m"
	CYAN = "\x1b[36m"
	WHITE = "\x1b[37m"
	DEFAULT = "\x1b[39m"
	CLEAR = "\x1b[2J"
	HOME = "\x1b[H"

	BG_BLACK = "\x1b[40m"
	BG_RED = "\x1b[41m"
	BG_GREEN = "\x1b[42m"
	BG_YELLOW = "\x1b[43m"
	BG_BLUE = "\x1b[44m"
	BG_MAGENTA = "\x1b[45m"
	BG_CYAN = "\x1b[46m"
	BG_WHITE = "\x1b[47m"

)

const ( // char
	horizontal   = "─"
	vertical     = "│"
	topLeft      = "┌"
	topRight     = "┐"
	bottomLeft   = "└"
	bottomRight  = "┘"
	teeLeft      = "├"
	teeRight     = "┤"
	teeTop       = "┬"
	teeBottom    = "┴"
	cross        = "┼"
)

const (
	max_height = 30
	max_width = 150
	control_width = 30
	)

func PrintFirstTime(){
	PrintTable()
	PrintMainMenu()

}

func PrintTable(){
	
	fmt.Print(CLEAR+HOME)

	for i := 0 ; i < max_height; i++ {
        for j := 0; j < max_width; j++ {
			switch {
            // border
			case i == 0 && j == 0:
			fmt.Print(topLeft);

			case i == 0 && j == max_width -1:
			fmt.Print(topRight);

			case i == max_height-1 && j == 0:
			fmt.Print(bottomLeft);

			case i == max_height-1 && j == max_width-1:
			fmt.Print(bottomRight);

			// thee

			case i == 0 && j == max_width - control_width:
			fmt.Print(teeTop)

			case i == max_height-1 && j == max_width - control_width:
			fmt.Print(teeBottom)

			// line
			case i == 0 || i == max_height-1:
			fmt.Print(horizontal);

			case j == 0 || j == max_width -1 || j == max_width - control_width:
			fmt.Print(vertical);

			default:
			fmt.Print(" ");
            }
		}
		fmt.Print("\n");
    }

		fmt.Printf("\x1b[%d;%dH┐ Assets & Complaint Management System ┌", 0, max_width/2-30)
		fmt.Printf("\x1b[%d;%dH┐ Menu ┌", 0, max_width - control_width + 4)
	
}

func PrintMainMenu() {

	width_start := max_width - control_width + 2
	i := 3 //malas nulis height_start++ trus yahahaa
	
  fmt.Printf("\x1b[%d;%dH1. Kelola Inventaris", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH2. Kelola Komplain", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH3. Kelola User", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH0. Keluar", i, width_start)
	i++

	// posisi kursor input = 9, 52
}

func PrintAssetsMenu() {
	width_start := max_width - control_width + 2
	i := 3 //malas nulis height_start++ trus yahahaa
	
  fmt.Printf("\x1b[%d;%dH1. Tambah aset", i, width_start)
	i++
	//nanti print red/reset di hapus atau komen klo dh ada
	fmt.Print(RED)
	fmt.Printf("\x1b[%d;%dH2. Tambah kategori", i, width_start)
	i++
	fmt.Print(RESET)
	fmt.Printf("\x1b[%d;%dH3. Edit & update aset", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH4, Hapus aset", i, width_start)
	i++
	fmt.Printf("\x1b[%d;%dH0. Kembali", i, width_start)
	i++

}
