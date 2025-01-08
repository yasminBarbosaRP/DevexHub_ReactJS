package main
import "fmt"

func main() {
	n := 0
	for n <= 6 {
		fmt.Println(n)
		n = n + 1
	}

	// OU
	for j := 0; j <= 4; j++ {
		fmt.Println(n)
	}

	// OU
	for i := range 5 {
		fmt.Println(i)
	}

	// OU
	for {
		fmt.Println("loop")
		break
	}

	// OU
	for n := range 6 {
		if n%2 == 0 {
			continue
		}
		fmt.Println(n)
	}
}