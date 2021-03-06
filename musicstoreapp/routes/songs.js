const {ObjectId} = require("mongodb");

module.exports = function (app, songsRepository, commentsRepository) {
    app.get("/shop", function (req, res) {
        let filter = {};
        let options = {sort: {title: 1}};

        if (req.query.search != null && typeof (req.query.search) != "undefined" && req.query.search !== "") {
            filter = {"title": {$regex: ".*" + req.query.search + ".*"}};
        }

        let page = parseInt(req.query.page); // Es String !!!
        if (typeof req.query.page === "undefined" || req.query.page === null || req.query.page === "0") {
            //Puede no venir el param
            page = 1;
        }

        let songsPerPage = 4;

        songsRepository.getSongsPg(filter, options, page, songsPerPage).then(result => {
            let lastPage = result.total / songsPerPage;
            if (result.total % songsPerPage > 0) { // Sobran decimales
                lastPage = lastPage + 1;
            }
            let pages = []; // paginas mostrar
            for (let i = page - 2; i <= page + 2; i++) {
                if (i > 0 && i <= lastPage) {
                    pages.push(i);
                }
            }
            let response = {
                songs: result.songs,
                pages: pages,
                currentPage: page
            }
            res.render("shop.twig", response);
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
                res.send("Error al insertar canci??n");
            } else {
                if (req.files != null) {
                    let imagen = req.files.cover;
                    imagen.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err) {
                        if (err) {
                            res.send("Error al subir la portada de la canci??n")
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
            res.send("Se ha producido un error al recuperar la canci??n " + error);
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
                    res.send("Error al actualizar la portada o el audio de la canci??n");
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
            res.send("Se ha producido un error al intentar eliminar la canci??n: " + error)
        });
    });

    app.get('/songs/buy/:id', async function (req, res) {
        let songId = ObjectId(req.params.id);
        let shop = {
            user: req.session.user, songId: songId
        };
        let filter = {_id: songId};

        songsRepository.findSong(filter, {}).then(async song => {
            let songPurchased = await isSongPurchased(song, req.session.user, {});
            if (!songPurchased) {
                songsRepository.buySong(shop, function (shopId) {
                    if (shopId == null) {
                        res.send("Error al realizar la compra");
                    } else {
                        res.redirect("/purchases");
                    }
                });
            } else {
                res.redirect("/purchases?message=Ya%20eres%20due??o%20de%20la%20canci??n&messageType=alert-info")
            }
        }).catch(error => {
            res.send("Se ha producido un error al buscar la canci??n " + error);
        });


    });

    app.get('/songs/:id', async function (req, res) {
        let filter = {_id: ObjectId(req.params.id)};
        let options = {};

        songsRepository.findSong(filter, options).then(async song => {
            let songPurchased = await isSongPurchased(song, req.session.user, options);

            commentsRepository.getComments(filter, options).then(comments => {
                let settings = {
                    url: "https://www.freeforexapi.com/api/live?pairs=EURUSD",
                    method: "get",
                    headers: {
                        "token": "ejemplo",
                    }
                }
                let rest = app.get("rest");
                rest(settings, function (error, response, body) {
                    console.log("cod: " + response.statusCode + " Cuerpo :" + body);
                    let responseObject = JSON.parse(body);
                    let rateUSD = responseObject.rates.EURUSD.rate;
                    // nuevo campo "usd" redondeado a dos decimales
                    let songValue = rateUSD * song.price;
                    song.usd = Math.round(songValue * 100) / 100;
                    res.render("songs/song.twig", {song: song, comments: comments, has_song: songPurchased});
                });
            }).catch(error => {
                res.send("Se ha producido un error al cargar los comentarios " + error);
            });
        }).catch(error => {
            res.send("Se ha producido un error al buscar la canci??n " + error);
        });
    });

    async function isSongPurchased(song, userMail, options) {
        let filter = {songId: song._id, user: userMail};
        return songsRepository.getPurchases(filter, options).then(purchasedIds => {
            return purchasedIds.length === 1 || userMail === song.author;
        });
    }

    app.get('/songs/:kind/:id', function (req, res) {
        let response = "id: " + req.params.id + "<br>" + "Tipo de m??sica: " + req.params.kind;
        res.send(response);
    });
}