/* Index funciona como um controler */
    //Acessar banco de dados
    //Tratamento e validação dos dados

const express = require('express');
const expressHandlebars = require('express-handlebars');

const path = require('path');
const bodyParse = require('body-parser');
const mysql = require('mysql2/promise');
const PORT = process.env.PORT || 3000;
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
const uuidv4 = require('uuid').v4;

//port: '/var/run/mysqld/mysqld.sock';

const app = express();

app.engine('handlebars', expressHandlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use(sessions({
    secret: "thisIsMySecretKey",
    saveUninitialized: true,
    resave: false,
    name: 'Cookie de Sessao',
    cookie: { maxAge: 1000 * 60 * 3 } // 3 minutos
}));



// função que vai abrir e retornar a conexão com o banco de dados
async function getConnection()
{
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'root',
        database: 'clinica_veterinaria'
    });
    return connection;
}

async function query(sql = '', values = [])
{
    const conn = await getConnection();
    const result = await conn.query(sql, values);
    conn.end();

    return result[0];
}
//-------------LOGIN-----------------
// Qualquer requisição de qualquer tipo GET, POST, PUT e DELETE...
app.use("*", async function(req, res, next) {
    if (!req.session.usuario && req.cookies.token) {
        const resultado = await query("SELECT * FROM usuarios WHERE token = ?", [req.cookies.token]);
        if (resultado.length) {
            req.session.usuario = resultado[0];
        }
    }
    next();
});

app.get("/", async function(req, res) {
    if (!req.session.usuario) {
        res.redirect("/login");
        return;
    }

    const animais = await query('SELECT * FROM animal');

    //response.json(animais);

    res.render('home', {
        tituloPagina: 'Animais em tratamento',
        listaAnimais: animais
    })
});

app.get("/logout", function(req, res) {
    res.cookie("token", "");
    req.session.destroy();
    res.redirect("/login");
});

app.get("/login", function(req, res) {
    res.render("login", {
        tituloPagina: "Login",
        titulo: "Login",
        frase: "Utilize o formulário abaixo para realizar o login na aplicação."
    });
});


app.post("/login", async function(req, res) {
    const { user:usuario, pwd, keep_logged } = req.body;
    const resultado = await query("SELECT * FROM usuarios WHERE email = ? AND senha = ?", [usuario, pwd]);
    console.log(resultado);

    if (resultado.length > 0) {
        if (keep_logged) {
            const token = uuidv4();
            console.log(token);
            const isOk = await query("UPDATE usuarios SET token = ? WHERE usuario_id = ?", [token, resultado[0].usuario_id]);
            console.log(isOk);
            res.cookie("token", token);
        }

        req.session.usuario = resultado[0];
        res.redirect("/");
        return;
    }

    res.render("login", {
        tituloPagina: "Login",
        titulo: "Login",
        frase: "Utilize o formulário abaixo para realizar o login na aplicação.",
        mensagemErro: "Usuário/Senha inválidos!"
    });
});




/* Homepage */
app.get("/home", async function(request, response){

    const animais = await query('SELECT * FROM animal');

    //response.json(animais);

    response.render('home', {
        tituloPagina: 'Animais em tratamento',
        listaAnimais: animais
    })
});

app.get("/excluir-animal", async function(request, response){
    const id = parseInt(request.query.id);
    if(!isNaN(id) && id > 0){
        await query(`DELETE FROM animal WHERE cod_animal = ?`, [id]);
    }
    response.redirect('/');
});

/* Cadastrar Animal */
app.get('/cadastrar-animal', function(request,response){
    response.render('Cadastrar-animal', {tituloPagina: 'Cadastrar Animal'})
});

app.post('/cadastrar-animal', async function(request, response){
    let nome = request.body.nome;
    let tipo = request.body.tipo;
    let raca = request.body.raca;

    const dadosPagina = {
        tituloPagina: 'Cadastrar Produto',
        mensagem: '',
        nome,
        tipo,
        raca
    }
    try{
        if(!nome) throw new Error('Nome é obrigatório!');
        if(!tipo) throw new Error('Tipo é obrigatório!');
        if(!raca) throw new Error('Raca é obrigatório!');

        const sql = "INSERT INTO animal (nome_animal,tipo_animal,raca_animal,consulta_codigo) VALUES (?, ?, ?,126)";
        const valores = [nome, tipo, raca];

        await query(sql, valores);

        dadosPagina.mensagem = 'Produto Cadastrado com sucesso!';
        dadosPagina.cor = "green";
    }
    catch(e){
        dadosPagina.mensagem = e.message;
        dadosPagina.cor = "red";
    }
    response.render('cadastrar-animal', dadosPagina);
});

/* Editar Animal */
app.get('/editar-animal', async function(request, response){
    const id = parseInt(request.query.id);
    const dadosAnimais = await query("SELECT * FROM animal WHERE cod_animal = ?", [id]);
    //console.log(dadosAnimais);
    if(dadosAnimais.length === 0){
        response.redirect("/");
    }
    response.render('editar-animal',{
        tituloPagina:'Editar dados animais',
        cod_animal: dadosAnimais[0].cod_animal,
        nome: dadosAnimais[0].nome_animal,
        tipo: dadosAnimais[0].tipo_animal,
        raca: dadosAnimais[0].raca_animal,
        id_consulta: dadosAnimais[0].consulta_codigo
    });
});

app.post('/editar-animal', async function(request, response){
    //const id = parseInt(request.query.id);
    let {id_consulta, nome, tipo, raca, cod_animal} = request.body;

    const dadosPagina = {
        tituloPagina: "Editar Animal",
        mensagem: '',
        nome, tipo, raca, id_consulta
    }

    try{
        if(!nome) throw new Error('Nome é obrigatório!');
        if(!tipo) throw new Error('Tipo é obrigatório!');
        if(!raca) throw new Error('Raca é obrigatório!');
        //const sql = "UPDATE animal SET nome_animal = ?, tipo_animal = ?, raca_animal = ? WHERE cod_animal = ?";
        //const valores = [nome, tipo, raca, cod_animal];
        

        await query("UPDATE animal SET nome_animal = ?, tipo_animal = ?, raca_animal = ? WHERE cod_animal = ?", [nome, tipo, raca, cod_animal]);
        //await query(sql,valores);

        dadosPagina.mensagem = 'Produto atualizado com sucesso!';
        dadosPagina.cor = "green";
    }
    catch(e){
        dadosPagina.mensagem = e.message;
        dadosPagina.cor = "red";
    }
    response.render('editar-animal', dadosPagina);
});

/* Sobre */
app.get("/sobre", function(request, response){
    response.render('sobre', {
        tituloPagina: 'Esta é a página Sobre!',
        nome: 'Ricardo',
        idade: 35
    })
});

/* Contato */
app.get("/contato", function(request, response){
    response.render('contato')
});

app.post('/contato', function(request, response){
//desestruturação do objeto
    let {nome, email, idade, linguagens} = request.body;

    let dadosRender = null;

    try{

    dadosRender = {
        dadosValidos: true, nome, email, idade, linguagens
    };

    if(nome.length < 3){
        throw new Error('Nome precisa ter pelo menos 3 letras!');
    }

    if(!email) throw new Error('E-mail é invalido!');

    }
    catch(e){
        dadosRender = {
            dadosValidos: false,
            mensagemErro: e.message
        }
    }


    /* Validação de dados */
    response.render('contato.handlebars', dadosRender);

});

/* Login 
app.get("/login", function(request, response){
    response.render('login')
});

app.post('/login', function(request, response){
    //desestruturação do objeto
        let {nome, email, idade, linguagens} = request.body;
    
        let dadosRender = null;
    
        try{
    
        dadosRender = {
            dadosValidos: true, nome, email, idade, linguagens
        };
    
        if(nome.length < 3){
            throw new Error('Nome precisa ter pelo menos 3 letras!');
        }
    
        if(!email) throw new Error('E-mail é invalido!');
    
        }
        catch(e){
            dadosRender = {
                dadosValidos: false,
                mensagemErro: e.message
            }
        }
    
    
        // Validação de dados 
        response.render('login.handlebars', dadosRender);
    
    });
*/

app.listen(PORT, function(){
    console.log(`Server is running at port ${PORT}`)
});
