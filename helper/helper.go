package input

import (
	"bufio" 
	"fmt"
	"strconv"
	"strings"
	"os"
)

var reader = bufio.NewReader(os.Stdin)

func Input(label string) string {
	// Catatan: helper ini dipakai supaya input seperti nama bisa memakai spasi.
	fmt.Print(label)
	text, _ := reader.ReadString('\n')
	return strings.TrimSpace(text)
}

func InputInt(label string) int {
	value, _ := strconv.Atoi(Input(label))
	return value
}

  
