package main

import (
	"fmt"
	"time"
)

func main() {
	var cont int
	fmt.Println("Você deseja que sua contagem regressiva começe em que número?")
	fmt.Scan(&cont)
	for n := 0; n <= cont; n++ {
		fmt.Println(cont - n)
		time.Sleep(1 * time.Second)
	}
}