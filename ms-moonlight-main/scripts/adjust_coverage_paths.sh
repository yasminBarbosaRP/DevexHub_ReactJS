#!/bin/bash

# Este script é usado para ajustar os caminhos dos arquivos no arquivo lcov.info para que eles possam ser encontrados pelo sonar corretamente. 

# Encontra todos os arquivos lcov.info e processa cada um
echo "Adicionando caminho do diretório ao campo SF de cada linha correspondente em todos os arquivos lcov.info"
find . -name "lcov.info" | while read -r lcov_file; do
    # Extrai o diretório onde o arquivo lcov.info está localizado
    dir=$(dirname "$lcov_file")

    echo "Executando em $dir"
    #remove o nome `coverage` do caminho do diretório
    dir=$(echo $dir | sed 's/\/coverage//')
    
    # Adiciona o caminho do diretório ao campo SF de cada linha correspondente
    # sed -i "" "s|SF:|SF:$dir/|g" "$lcov_file" # For macOS
    sed -i "s|SF:|SF:$dir/|g" "$lcov_file"
done
echo "All lcov.info files have been updated."
