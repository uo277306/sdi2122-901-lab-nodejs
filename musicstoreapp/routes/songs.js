module.exports = function (app) {
    app.get("/songs", function (req, res) {
        let response = "";
        if (req.query.title != null && typeof (req.query.title) != "undefined") {
            response += "Titulo: " + req.query.title + "<br>";
        }
        if (req.query.author != null && typeof (req.query.author) != "undefined") {
            response += "Autor: " + req.query.author;
        }
        res.send(response);
    });

    app.get('/songs/:id', function (req, res) {
        let response = 'id: ' + req.params.id;
        res.send(response);
    });

    app.get('/songs/:kind/:id', function (req, res) {
        let response = 'id: ' + req.params.id + '<br>' + 'Tipo de música: ' + req.params.kind;
        res.send(response);
    });
};