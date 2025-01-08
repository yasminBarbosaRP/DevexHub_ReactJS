## Portuguese:

Tudo que precisa ser feito para configurar o .yarnrc, localmente.

Primeiramente será necessário criar um novo token na sua conta do Github e ter as roles:

- public_repo, read:packages, repo:status, write:packages
- Salve esse Token gerado
- Vincule seu token ao SSO do PicPay
- Navegue até a raiz do seu usuário, por exemplo: ~/
- Execute o comando a seguir:

```bash
export GITHUB_TOKEN=[SEU TOKEN]
echo "@picpay:registry=https://npm.pkg.github.com" > ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc
```

E ficará assim: ~/.yarnrc, esse processo é realizado para que você possa instalar um pacote privado via npm, do PicPay. Existe outro processo realizado via NPM que fica no README do Repositório https://github.com/PicPay/picpay-frontend, porém utilizamos o yarn como Gerenciador de Pacotes no Moonlight.

Após realizado os processos anteriores:

- Adicione de forma manual o pacote desejado no package.json
  - Exemplo: "@picpay/event-tracking": "^1.1.1"
- Navegue até a raiz do projeto Moonlight via terminal e execute o seguinte comando:

  - npm login --registry=https://npm.pkg.github.com --scope=@PicPay

  Informe o seu usuário do Github, próximo passo ele pede sua senha, porém por padrão do Github, após criado um token, você passará utilizar o token como senha.
  Então escreva seu token ao ser solicitado a senha
  E por fim ele pede seu e-mail (público) - no caso você irá informar o mesmo e-mail do token/PicPay

Após imprimir o retorno de login efetuado com sucesso, pode rodar o yarn (abreviação do comando: yarn install)

Pronto, seu pacote foi instalado com sucesso. Em relação a instalação do pacote via Pipeline já está automatizada no arquivo Dockerfile.

Caso encontre problemas de permissão, tente rodar o comando com:
`yarn add --cwd packages/app @picpay/event-tracking --registry=https://npm.pkg.github.com`

## English:

Everything that needs to be done to configure .yarnrc locally.

first, you will need to create a new token in your Github account and have the roles:

- public_repo, read:packages, repo:status, write:packages
- Save this generated Token
- Link your token to PicPay SSO
- Navigate to your user root, for example, ~/
- Run the following command:
  `echo '"@picpay:registry"' '"https://npm.pkg.github.com/PicPay"' > ~/.yarnrc`

And it will be like this: ~/.yarnrc, this process is performed so that you can install a private package via npm, from PicPay. There is another process performed via NPM that is in the README of the Repository https://github.com/PicPay/picpay-frontend, but we use the thread as a Package Manager in Moonlight.

After carrying out the previous processes:

- Manually add the desired package in package.json
  - Example: "@picpay/event-tracking": "^1.1.1"
- Navigate to the Moonlight project root via terminal and run the following command:

  - npm login --registry=https://npm.pkg.github.com --scope=@PicPay

  Inform your Github user, that the next step asks for your password, but by default on Github, after creating a token, you will use the token as a password.
  write your token when prompted for the password
  And finally, it asks for your (public) email - in this case, you will enter the same email as the token/PicPay

After successfully printing the login return, you can run yarn (after the command: yarn install)

Okay, your package has been successfully installed. Regarding the installation of the package via Pipeline, it is already registered in the Dockerfile.

In case you're having permissions issue, try running the following command:
`yarn add --cwd packages/app @picpay/event-tracking --registry=https://npm.pkg.github.com`
