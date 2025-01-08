package main
import "fmt"

func main() {
	y := 2
	fmt.Print("Escreva ", y, " como ")
	switch y {
	case 1:
    	fmt.Println("one")
	case 2:
    	fmt.Println("two")
	case 3:
    	fmt.Println("three")
	}
}
