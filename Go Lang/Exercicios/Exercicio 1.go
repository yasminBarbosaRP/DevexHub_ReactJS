package main

import "fmt"

func main() {
	var num int
	fmt.Println("Digite um número: ")
	fmt.Scan(&num)
	if num%2 == 0 {
		fmt.Println("O número", num, "é par")
	} else {
		fmt.Println("O número", num, "é ímpar")
	}
}