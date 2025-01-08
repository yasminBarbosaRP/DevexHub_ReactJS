package main
import "fmt"

func main() {
	if 8%4 == 0 {
		fmt.Println("8 é divisível por 4")
	}			

	if num := 9; num < 0 {
			fmt.Println(num, "é negativo")
	} else if num < 10 {
		fmt.Println(num, "tem apenas 1 dígito")
	} else {
		fmt.Println(num, "tem mais de um dígito")
	}
}