module.exports = function (app, usersRepository) {
    app.get('/users', function (req, res) {
        res.send('lista de usuarios');
    });

    app.get('/users/login', function (req, res) {
        res.render("users/login.twig");
    })

    app.post('/users/login', function (req, res) {
        let securePassword = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        let filter = {
            email: req.body.email,
            password: securePassword
        };
        let options = {};

        usersRepository.findUser(filter, options).then(user => {
                if (user == null) {
                    req.session.user = null;
                    res.redirect("/users/login" +
                        "?message=Email%20o%20password%20incorrecto" +
                        "&messageType=alert-danger");

                } else {
                    req.session.user = user.email;
                    res.redirect("/publications")
                }
            }
        ).catch(error => {
            req.session.user = null;
            res.redirect("/users/login" +
                "?message=Se%20ha%20producido%20un%20error%20al%20buscar%20el%20usuario" +
                "&messageType=alert-danger");
        });
    });

    app.get('/users/logout', function (req, res) {
        req.session.user = null;
        res.redirect("/shop");
    });

    app.get('/users/signup', function (req, res) {
        res.render("users/signup.twig");
    });

    app.post('/users/signup', function (req, res) {
        let securePassword = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        let user = {
            email: req.body.email,
            password: securePassword
        }
        usersRepository.insertUser(user).then(userId => {
            res.redirect("/users/login?message=Nuevo%20usuario%20registrado.&messageType=alert-info")
        }).catch(error => {
            res.redirect("/users/login?message=Se%20ha%20producido%20un%20error%20al%20registrar%20al%20usuario.&messageType=alert-danger")
        });
    });
}
