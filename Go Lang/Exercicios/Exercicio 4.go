package main

import "fmt"

func main() {
	var num2 int
	var array2 [3]int
	for cont := 0; cont < len(array2); cont++ {
		fmt.Println("Digite o número", cont+1, ":")
		fmt.Scan(&num2)
		array2[cont] = num2
	}
	if array2[0] > array2[1] && array2[0] > array2[2] {
		fmt.Println("O maior número é:", array2[0])
	} else if array2[1] > array2[0] && array2[1] > array2[2] {
		fmt.Println("O maior número é:", array2[1])
	} else {
		fmt.Println("O maior número é:", array2[2])
	}
}