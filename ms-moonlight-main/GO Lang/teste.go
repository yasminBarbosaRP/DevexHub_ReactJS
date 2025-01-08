package main

import (
	"github.com/signintech/gopdf"
	"log"
)

func main() {
	// Cria um novo objeto PDF
	pdf := gopdf.GoPdf{}
	
	// Inicializa o PDF com tamanho de página A4
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})

	// Adiciona uma página
	pdf.AddPage()

	// Define a fonte para o texto (é necessário ter a fonte TTF no seu computador)
	var err error
	err = pdf.AddTTFFont("arial", "/home/yasmin/Desktop/GO Lang/Fonts/Arial.ttf")
	if err != nil {
		log.Fatal(err)
	}
	
	// Usa a fonte adicionada
	err = pdf.SetFont("arial", "", 14)
	if err != nil {
		log.Fatal(err)
	}
	
	// Adiciona um texto na posição (x=100, y=100) da página
	pdf.Cell(nil, "Este é um PDF teste gerado com GO lang!")

	// Salva o PDF em um arquivo
	err = pdf.WritePdf("PDF's/exemplo.pdf")
	if err != nil {
		log.Fatal(err)
	}

	log.Println("PDF gerado com sucesso!")
}
