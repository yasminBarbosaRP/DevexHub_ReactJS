package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func main() {
	fmt.Println("Escreva a seguir o seu texto para a contagem de palavras:")

	scanner := bufio.NewScanner(os.Stdin)
	var frase []string

	// Conta o número de linhas
	for scanner.Scan() {
		linha := scanner.Text()
		if linha == "sair" {
			break
		} else {
			frase = append(frase, linha)
		}
	}

	var cont int
	for n := 0; n < len(frase); n++ {
		palavras := strings.Split(frase[n], " ")
		cont += len(palavras)
	}

	fmt.Println("\nNúmero de linhas:", len(frase))
	fmt.Println("Número de palavras:", cont)
}