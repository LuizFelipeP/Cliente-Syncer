##  1. Clone o Repositório

git clone https://github.com/LuizFelipeP/Cliente-Syncer.git

## 2. Instalar Dependências

npm install

## 3. Criar um arquivo dentro do projeto chamado '.env.local' com as seguintes informações dentro do arquivo:



```
NEXT_PUBLIC_API_PROTOCOL=http
NEXT_PUBLIC_API_HOST=192.168.0.2
NEXT_PUBLIC_API_PORT=3008

```
## 4. Iniciar a aplicação

``` bash
npm run build
npm run start

ou

npm run dev (Não funciona o PWA)

```
## 5. Acessar a aplicação:

http://localhost:3000
