const {ObjectId} = require("mongodb");

module.exports = function (app, commentsRepository) {
    app.post('/comments/:song_id', function (req, res) {
        if (req.session.user == null) {
            res.send("Usuario no identificado");
            return;
        }

        let comment = {
            author: req.session.user,
            text: req.body.comment_text,
            song_id: ObjectId(req.params.song_id)
        };

        commentsRepository.addComment(comment, function (commentId) {
            if (commentId == null) {
                res.send("Error al insertar comentario");
            } else {
                res.send("Agregada el comentario con el ID: " + commentId);
            }
        });
    });
};