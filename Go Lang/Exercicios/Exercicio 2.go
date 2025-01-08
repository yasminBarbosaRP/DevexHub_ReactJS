package main

import "fmt"

func main() {
	var idade int
	fmt.Println("\nDigite sua idade:")
	fmt.Scan(&idade)
	if idade <= 12 {
		fmt.Println("Criança")
	} else if idade <= 17 {
		fmt.Println("Adolescente")
	} else {
		fmt.Println("Adulto")
	}
}