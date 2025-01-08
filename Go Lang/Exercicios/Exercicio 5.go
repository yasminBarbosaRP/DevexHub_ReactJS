package main

import "fmt"

func main() {
	var num3 int
	var soma int
	var array [5]int
	for cont := 0; cont < len(array); cont++ {
		fmt.Println("Digite um número", cont+1, ":")
		fmt.Scan(&num3)
		array[cont] = num3
	}
	for cont := 0; cont < len(array); cont++ {
		soma += array[cont]
	}
	fmt.Println("Soma:", soma)
}