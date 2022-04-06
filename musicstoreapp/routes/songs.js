const {ObjectId} = require("mongodb");

module.exports = function (app, songsRepository, commentsRepository) {
    app.get("/shop", function (req, res) {
        let filter = {};
        let options = {sort: {title: 1}};

        if (req.query.search != null && typeof (req.query.search) != "undefined" && req.query.search !== "") {
            filter = {"title": {$regex: ".*" + req.query.search + ".*"}};
        }

        songsRepository.getSongs(filter, options).then(songs => {
            res.render("shop.twig", {songs: songs});
        }).catch(error => {
            res.send("Se ha producido un error al listar las canciones " + error);
        })
    });

    app.get('/publications', function (req, res) {
        let filter = {author: req.session.user};
        let options = {sort: {title: 1}};
        songsRepository.getSongs(filter, options).then(songs => {
            res.render("publications.twig", {songs: songs});
        }).catch(error => {
            res.send("Se ha producido un error al listar las publicaciones del usuario:" + error)
        });
    });

    app.get('/purchases', function (req, res) {
        let filter = {user: req.session.user};
        let options = {projection: {_id: 0, songId: 1}};
        songsRepository.getPurchases(filter, options).then(purchasedIds => {
            let purchasedSongs = [];
            for (let i = 0; i < purchasedIds.length; i++) {
                purchasedSongs.push(purchasedIds[i].songId)
            }
            let filter = {"_id": {$in: purchasedSongs}};
            let options = {sort: {title: 1}};
            songsRepository.getSongs(filter, options).then(songs => {
                res.render("songs/purchase.twig", {songs: songs});
            }).catch(error => {
                res.send("Se ha producido un error al listar las publicaciones del usuario: " + error)
            });
        }).catch(error => {
            res.send("Se ha producido un error al listar las canciones del usuario " + error)
        });
    })

    app.get("/songs", function (req, res) {
        res.redirect("/publications");
    });

    app.get('/songs/add', function (req, res) {
        res.render("songs/add.twig");
    });

    app.post('/songs/add', function (req, res) {
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        };

        songsRepository.insertSong(song, function (songId) {
            if (songId == null) {
                res.send("Error al insertar canción");
            } else {
                if (req.files != null) {
                    let imagen = req.files.cover;
                    imagen.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err) {
                        if (err) {
                            res.send("Error al subir la portada de la canción")
                        } else {
                            if (req.files.audio != null) {
                                let audio = req.files.audio;
                                audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function (err) {
                                    if (err) {
                                        res.send("Error al subir el audio");
                                    } else {
                                        res.redirect("/publications");
                                    }
                                });
                            }
                        }
                    });
                } else {
                    res.redirect("/publications");
                }
            }
        });
    });

    app.get('/songs/edit/:id', function (req, res) {
        let filter = {_id: ObjectId(req.params.id)};
        songsRepository.findSong(filter, {}).then(song => {
            res.render("songs/edit.twig", {song: song});
        }).catch(error => {
            res.send("Se ha producido un error al recuperar la canción " + error);
        });
    });

    app.post('/songs/edit/:id', function (req, res) {
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }
        let songId = req.params.id;
        let filter = {_id: ObjectId(songId)};
        //que no se cree un documento nuevo, si no existe
        const options = {upsert: false}
        songsRepository.updateSong(song, filter, options).then(result => {
            step1UpdateCover(req.files, songId, function (result) {
                if (result == null) {
                    res.send("Error al actualizar la portada o el audio de la canción");
                } else {
                    res.redirect("/publications");
                }
            });
        });
    });

    function step1UpdateCover(files, songId, callback) {
        if (files && files.cover != null) {
            let image = files.cover;
            image.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    step2UpdateAudio(files, songId, callback); // SIGUIENTE
                }
            });
        } else {
            step2UpdateAudio(files, songId, callback); // SIGUIENTE
        }
    }

    function step2UpdateAudio(files, songId, callback) {
        if (files && files.audio != null) {
            let audio = files.audio;
            audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    callback(true); // FIN
                }
            });
        } else {
            callback(true); // FIN
        }
    }

    app.get('/songs/delete/:id', function (req, res) {
        let filter = {_id: ObjectId(req.params.id)};
        songsRepository.deleteSong(filter, {}).then(result => {
            if (result == null || result.deletedCount == 0) {
                res.send("No se ha podido eliminar el registro");
            } else {
                res.redirect("/publications");
            }
        }).catch(error => {
            res.send("Se ha producido un error al intentar eliminar la canción: " + error)
        });
    });

    app.get('/songs/buy/:id', function (req, res) {
        let songId = ObjectId(req.params.id);
        let shop = {
            user: req.session.user,
            songId: songId
        }

        songsRepository.buySong(shop, function (shopId) {
            if (shopId == null) {
                res.send("Error al realizar la compra");
            } else {
                res.redirect("/purchases");
            }
        })
    });

    app.get('/songs/:id', function (req, res) {
        let filter = {_id: ObjectId(req.params.id)};
        let options = {};

        songsRepository.findSong(filter, options).then(song => {
            commentsRepository.getComments(filter, options).then(comments => {
                res.render("songs/song.twig", {song: song, comments: comments});
            }).catch(error => {
                res.send("Se ha producido un error al cargar los comentarios " + error);
            });
        }).catch(error => {
            res.send("Se ha producido un error al buscar la canción " + error);
        });
    });

    app.get('/songs/:kind/:id', function (req, res) {
        let response = "id: " + req.params.id + "<br>" + "Tipo de música: " + req.params.kind;
        res.send(response);
    });
}