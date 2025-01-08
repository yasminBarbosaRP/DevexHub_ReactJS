package main
import (
"bufio"
"fmt"
"os"
)

func main() {
	var input int
	fmt.Print("Digite um número: ")
	fmt.Scan(&input) // fmt.Scanln usado para ler variaveis simples
	fmt.Println("Você digitou:", input)

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Println("\nDigite um trecho de um livro: ")
	var trecho string
	for scanner.Scan() { // fmt.Scanln usado para ler variaveis com mais de uma linha
		linha := scanner.Text()
		if linha == "sair" { // Condição para sair do loop
			break
		} else {
			trecho = trecho+" "+linha
		}
	}
	fmt.Println("Seu trecho escolhido foi:", trecho)
}