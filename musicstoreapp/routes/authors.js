module.exports = function (app) {
    app.get('/authors/', function (req, res) {
        let authors = [
            {"name": "Stellar", "group": "Channel 47", "rol": "Cantante"},
            {"name": "Gabry Ponte", "group": "Eiffel 65", "rol": "Teclista"},
            {"name": "Scott Rill", "group": "None", "rol": "Bajista"}
        ];

        let response = {"authors": authors};
        res.render("authors/authors.twig", response);
    });

    app.get('/authors/add', function (req, res) {
        res.render("authors/add.twig");
    });

    app.post('/authors/add', function (req, res) {
        let response = "Autor agregado: ";
        if (req.body.name != null && typeof (req.body.name) != "undefined") {
            response += "<br>Nombre: " + req.body.name;
        } else {
            response += "<br>Nombre no enviado en la petición.";
        }

        if (req.body.group != null && typeof (req.body.group) != "undefined") {
            response += "<br>Grupo: " + req.body.group;
        } else {
            response += "<br>Grupo no enviado en la petición.";
        }

        if (req.body.rol != null && typeof (req.body.rol) != "undefined") {
            response += "<br>Rol: " + req.body.rol;
        } else {
            response += "<br>Rol no enviado en la petición.";
        }
        res.send(response);
    });

    app.get('/authors*', function (req, res) {
        res.redirect("/authors");
    });
};