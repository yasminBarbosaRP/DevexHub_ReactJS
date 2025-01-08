package main

import "fmt"

func main() {
	var array [5]int // declarando uma array
	array[1] = 12 // declarando o valor 12 para a posição 1 da array

	fmt.Println("array:", array)
	fmt.Println("array posição 1:", array[1])
	fmt.Println("size: ", len(array))

	var array2 =  [5]int{1,2,3,4,5} // declarando um array com os valores já setados
	fmt.Println("array 2:", array2)

	var array3 = [...]int{100, 3: 400, 500} // o :n serve para pular até a n casa e setar um valor aquela posição
	fmt.Println("array 3:", array3)

	var matriz = [3][3]string{
		{"x", "o", "o"},
		{"o", "x", "o"},
		{"o", "o", "x"},
	}
	fmt.Println("\nmatriz:")

	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			fmt.Print(matriz[i][j]," ")
		}
		fmt.Println("")
	}
}