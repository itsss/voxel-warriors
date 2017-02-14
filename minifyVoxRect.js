"use strict";
var NodeConf = require(__dirname + "/NodeConf.js")();
var NodeRect = require(__dirname + "/NodeRect.js")();
var Node = NodeRect.Node;
var Aws = NodeRect.Aws;
var Express = NodeRect.Express;
var Geoip = NodeRect.Geoip;
var Hypertextmin = NodeRect.Hypertextmin;
var Mime = NodeRect.Mime;
var Multer = NodeRect.Multer;
var Mustache = NodeRect.Mustache;
var Phantom = NodeRect.Phantom;
var Postgres = NodeRect.Postgres;
var Recaptcha = NodeRect.Recaptcha;
var Socket = NodeRect.Socket;
var Xml = NodeRect.Xml;
var VoxConf = require(__dirname + "/VoxConf.js")();
var ScriptManager = require(__dirname + "/ScriptManager.js");
ScriptManager.init(NodeRect);
Express.objectServer.use(function(objectRequest, objectResponse, functionNext) {
    var strName = "";
    var strPassword = "";
    var strAuthorization = objectRequest.get("Authorization");
    if (void 0 !== strAuthorization) {
        var strEncoded = strAuthorization.split(" ");
        if (2 === strEncoded.length) {
            var strDecoded = new Buffer(strEncoded[1], "base64").toString().split(":");
            if (2 === strDecoded.length) {
                strName = strDecoded[0];
                strPassword = strDecoded[1]
            }
        }
    }
    if ("" !== VoxConf.strLoginPassword) {
        if (VoxConf.strLoginPassword === strPassword) {
            functionNext();
            return
        }
        objectResponse.status(401);
        objectResponse.set({
            "WWW-Authenticate": 'Basic realm="' + VoxConf.strName + '"'
        });
        objectResponse.end()
    } else functionNext()
});
Express.objectServer.use(function(objectRequest, objectResponse, functionNext) {
    objectResponse.header("Access-Control-Allow-Origin", "*");
    functionNext()
});
Express.objectServer.get("/", function(objectRequest, objectResponse) {
    objectResponse.status(302);
    objectResponse.set({
        Location: "/index.html"
    });
    objectResponse.end()
});
Express.objectServer.get("/index.html", function(objectRequest, objectResponse) {
    var Mustache_objectView = {
        objectMain: {
            strRandom: Node.hashbase(Node.requireCrypto.randomBytes(64)).substr(0, 32)
        },
        objectGameserver: {
            intLoginPassword: Gameserver.intLoginPassword,
            strLoginMotd: Gameserver.strLoginMotd
        }
    };
    var functionPreprocess = function() {
        functionFilesystemRead()
    };
    var FilesystemRead_objectBuffer = null;
    var functionFilesystemRead = function() {
        Node.requireFs.readFile(__dirname + "/assets/index.html", function(objectError, objectBuffer) {
            if (null === objectError) {
                FilesystemRead_objectBuffer = objectBuffer;
                functionSuccess()
            } else functionError()
        })
    };
    var functionError = function() {
        objectResponse.end()
    };
    var functionSuccess = function() {
        var strData = FilesystemRead_objectBuffer.toString();
        strData = Mustache.requireMustache.render(strData, Mustache_objectView);
        strData = Mustache.requireMustache.render(strData, Mustache_objectView);
        strData = Hypertextmin.requireHtmlmin.minify(strData, {
            collapseWhitespace: true,
            conservativeCollapse: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true
        });
        objectResponse.status(200);
        objectResponse.set({
            "Content-Length": Buffer.byteLength(strData, "utf-8"),
            "Content-Type": Mime.requireMime.lookup("html"),
            "Content-Disposition": 'inline; filename="' + objectRequest.path.substr(objectRequest.path.lastIndexOf("/") + 1) + '";'
        });
        objectResponse.write(new Buffer(strData, "utf-8"));
        objectResponse.end()
    };
    functionPreprocess()
});
Express.objectServer.use("/", Express.requireExpress.static(__dirname + "/assets", {
    etag: false,
    lastModified: false
}));
Socket.objectServer.on("connection", function(objectSocket) {
    objectSocket.strIdent = objectSocket.id.substr(2, 8);
    var strIdent = objectSocket.strIdent;
    Player.objectPlayer[strIdent] = {
        strIdent: strIdent,
        strTeam: "",
        strEntity: "",
        strName: "",
        intScore: 0,
        intKills: 0,
        intDeaths: 0,
        intHealth: 0,
        dblPosition: [0, 0, 0],
        dblVerlet: [0, 0, 0],
        dblAcceleration: [0, 0, 0],
        dblRotation: [0, 0, 0],
        intJumpcount: 0,
        intWalk: 0,
        intWeapon: 0
    };
    Player.objectPlayer[objectSocket.strIdent].objectSocket = objectSocket;
    objectSocket.emit("eventWorld", {
        strBuffer: World.saveBuffer(null)
    });
    objectSocket.emit("eventLogin", {
        strType: "typeReject",
        strMessage: ""
    });
    objectSocket.on("eventLogin", function(objectData) {
        if (void 0 !== objectData.strName) {
            if (void 0 === objectData.strTeam) return;
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if ("" !== objectData.strTeam.replace(new RegExp("(teamRed)|(teamBlue)", ""), "")) return;
                if (Gameserver.intPlayerActive !== Gameserver.intPlayerCapacity) {
                    if ("" === objectData.strName) {
                        var resultData = {
                            strType: "typeReject",
                            strMessage: "name invalid"
                        };
                        var event = ScriptManager.callPlayerLoginEvent(objectData, resultData);
                        if (event.isCanceled()) {
                            objectSocket.emit("eventLogin", {
                                strType: "typeReject",
                                strMessage: event.getCanceledMessage()
                            });
                            return
                        }
                        objectSocket.emit("eventLogin", resultData);
                        return
                    }
                    if (objectData.strName.length > 20) objectData.strName = objectData.strName.substr(1, 20) + " ... ";
                    Player.objectPlayer[objectSocket.strIdent].strTeam = objectData.strTeam;
                    Player.objectPlayer[objectSocket.strIdent].strName = objectData.strName;
                    var resultData = {
                        strType: "typeAccept",
                        strMessage: ""
                    };
                    var event = ScriptManager.callPlayerLoginEvent(objectData, resultData);
                    if (!event.isCanceled()) {
                        objectSocket.emit("eventLogin", resultData);
                        Gameserver.playerRespawn(Player.objectPlayer[objectSocket.strIdent])
                    } else objectSocket.emit("eventLogin", {
                        strType: "typeReject",
                        strMessage: event.getCanceledMessage()
                    })
                } else {
                    var resultData = {
                        strType: "typeReject",
                        strMessage: "server full"
                    };
                    var event = ScriptManager.callPlayerLoginEvent(objectData, resultData);
                    if (event.isCanceled()) {
                        objectSocket.emit("eventLogin", {
                            strType: "typeReject",
                            strMessage: event.getCanceledMessage()
                        });
                        return
                    }
                    objectSocket.emit("eventLogin", resultData)
                }
            }
        }
    });
    objectSocket.on("eventPing", function(objectData) {
        if (void 0 !== objectData.intTimestamp)
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) objectSocket.emit("eventPing", {
                strPhaseActive: Gameserver.strPhaseActive,
                intPhaseRound: Gameserver.intPhaseRound,
                intPhaseRemaining: Gameserver.intPhaseRemaining,
                strWorldAvailable: Gameserver.strWorldAvailable,
                strWorldActive: Gameserver.strWorldActive,
                intPlayerActive: Gameserver.intPlayerActive,
                intPlayerCapacity: Gameserver.intPlayerCapacity,
                intScoreRed: Gameserver.intScoreRed,
                intScoreBlue: Gameserver.intScoreBlue
            })
    });
    objectSocket.on("eventChat", function(objectData) {
        if (void 0 !== objectData.strMessage)
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if ("" === objectData.strMessage) return;
                var event = ScriptManager.callPlayerChatEvent(objectData, objectSocket);
                if (!event.isCanceled()) {
                    if (objectData.strMessage.length > event.getMaxLength()) objectData.strMessage = objectData.strMessage.substr(1, event.getMaxLength()) + " ... ";
                    Socket.objectServer.emit("eventChat", {
                        strName: event.getName(),
                        strMessage: event.getMessage()
                    })
                } else if (null !== event.getCanceledMessage()) Socket.objectServer.emit("eventChat", {
                    strName: event.getCanceledSender(),
                    strMessage: event.getCanceledMessage(),
                    strReceiver: event.getName()
                })
            }
    });
    objectSocket.on("eventWorldCreate", function(objectData) {
        if (void 0 !== objectData.intCoordinate) {
            if (3 !== objectData.intCoordinate.length) return;
            else if (void 0 === objectData.strType) return;
            else if (void 0 === objectData.boolBlocked) return;
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if (Player.objectPlayer[objectSocket.strIdent].intWeapon > 0) return;
                else if (true === World.updateBlocked(objectData.intCoordinate)) return;
                Player.objectPlayer[objectSocket.strIdent].intWeapon = Constants.intInteractionPickaxeDuration;
                var dblPosition = [0, 0, 0];
                var dblSize = [0, 0, 0];
                dblPosition[0] = objectData.intCoordinate[0] + .5 * Constants.dblGameBlocksize;
                dblPosition[1] = objectData.intCoordinate[1] + .5 * Constants.dblGameBlocksize;
                dblPosition[2] = objectData.intCoordinate[2] + .5 * Constants.dblGameBlocksize;
                dblSize[0] = 1.25 * Constants.dblGameBlocksize;
                dblSize[1] = 1.25 * Constants.dblGameBlocksize;
                dblSize[2] = 1.25 * Constants.dblGameBlocksize;
                Physics.updateObjectcol({
                    dblPosition: dblPosition,
                    dblSize: dblSize
                }, function(functionObjectcol) {
                    var objectPlayer = null;
                    if (void 0 === functionObjectcol.strIdent) functionObjectcol.strIdent = Object.keys(Player.objectPlayer);
                    do {
                        objectPlayer = Player.objectPlayer[functionObjectcol.strIdent.pop()];
                        if (void 0 === objectPlayer) return null;
                        break
                    } while (true);
                    objectPlayer.dblSize = Constants.dblPlayerHitbox;
                    return objectPlayer
                }, function(objectPlayer) {
                    objectData.strType = "";
                    objectData.boolBlocked = true
                });
                if (false === objectData.boolBlocked) {
                    var event = ScriptManager.callBlockPlaceEvent(objectData, objectSocket);
                    if (!event.isCanceled()) {
                        World.updateCreate(objectData.intCoordinate, objectData.strType, objectData.boolBlocked);
                        Socket.objectServer.emit("eventWorldCreate", {
                            intCoordinate: objectData.intCoordinate,
                            strType: objectData.strType,
                            boolBlocked: objectData.boolBlocked
                        })
                    }
                }
            }
        }
    });
    objectSocket.on("eventWorldDestroy", function(objectData) {
        if (void 0 !== objectData.intCoordinate) {
            if (3 !== objectData.intCoordinate.length) return;
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if (Player.objectPlayer[objectSocket.strIdent].intWeapon > 0) return;
                else if (true === World.updateBlocked(objectData.intCoordinate)) return;
                Player.objectPlayer[objectSocket.strIdent].intWeapon = Constants.intInteractionPickaxeDuration;
                var event = ScriptManager.callBlockBreakEvent(objectData, objectSocket);
                if (!event.isCanceled()) {
                    World.updateDestroy(objectData.intCoordinate);
                    Socket.objectServer.emit("eventWorldDestroy", {
                        intCoordinate: objectData.intCoordinate
                    })
                }
            }
        }
    });
    objectSocket.on("eventPlayer", function(objectData) {
        if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
            var objectOverwrite = {};
            try {
                Player.loadBuffer(objectOverwrite, objectData.strBuffer)
            } catch (objectError) {
                objectOverwrite = {}
            }
            if (void 0 !== objectOverwrite[1]) {
                Player.objectPlayer[objectSocket.strIdent].dblPosition = objectOverwrite[1].dblPosition;
                Player.objectPlayer[objectSocket.strIdent].dblVerlet = objectOverwrite[1].dblVerlet;
                Player.objectPlayer[objectSocket.strIdent].dblAcceleration = objectOverwrite[1].dblAcceleration;
                Player.objectPlayer[objectSocket.strIdent].dblRotation = objectOverwrite[1].dblRotation
            }
        }
    });
    objectSocket.on("eventPlayerEntity", function(objectData) {
        if (void 0 !== objectData.strEntity)
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if ("" !== objectData.strEntity.replace(new RegExp("(entityPickaxe)|(entitySword)|(entityBow)", ""), "")) return;
                Player.objectPlayer[objectSocket.strIdent].strEntity = objectData.strEntity
            }
    });
    objectSocket.on("eventPlayerWeapon", function(objectData) {
        if (void 0 !== objectData.strWeapon)
            if (void 0 !== Player.objectPlayer[objectSocket.strIdent]) {
                if (Player.objectPlayer[objectSocket.strIdent].intWeapon > 0) return;
                if ("weaponSword" === objectData.strWeapon) Player.objectPlayer[objectSocket.strIdent].intWeapon = Constants.intInteractionSwordDuration;
                else if ("weaponBow" === objectData.strWeapon) Player.objectPlayer[objectSocket.strIdent].intWeapon = Constants.intInteractionBowDuration;
                if ("weaponSword" === objectData.strWeapon) {
                    var strIdent = "itemSword - " + Node.hashbase(Node.requireCrypto.randomBytes(16)).substr(0, 8);
                    var strPlayer = Player.objectPlayer[objectSocket.strIdent].strIdent;
                    var dblPosition = [0, 0, 0];
                    var dblVerlet = [0, 0, 0];
                    var dblAcceleration = [0, 0, 0];
                    var dblRotation = [0, 0, 0];
                    dblPosition[0] = Player.objectPlayer[objectSocket.strIdent].dblPosition[0];
                    dblPosition[1] = Player.objectPlayer[objectSocket.strIdent].dblPosition[1] + .25 * Constants.dblPlayerSize[1];
                    dblPosition[2] = Player.objectPlayer[objectSocket.strIdent].dblPosition[2];
                    dblVerlet[0] = dblPosition[0];
                    dblVerlet[1] = dblPosition[1];
                    dblVerlet[2] = dblPosition[2];
                    dblAcceleration[0] = -1 * Math.sin(Player.objectPlayer[objectSocket.strIdent].dblRotation[1]) * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[2]);
                    dblAcceleration[1] = -1 * Math.sin(Player.objectPlayer[objectSocket.strIdent].dblRotation[2] + 1 * Math.PI);
                    dblAcceleration[2] = -1 * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[1]) * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[2]);
                    dblRotation[0] = Player.objectPlayer[objectSocket.strIdent].dblRotation[0];
                    dblRotation[1] = Player.objectPlayer[objectSocket.strIdent].dblRotation[1];
                    dblRotation[2] = Player.objectPlayer[objectSocket.strIdent].dblRotation[2];
                    var objectItem = {
                        strIdent: strIdent,
                        strPlayer: strPlayer,
                        dblPosition: dblPosition,
                        dblVerlet: dblVerlet,
                        dblAcceleration: dblAcceleration,
                        dblRotation: dblRotation
                    };
                    objectItem.dblSize = [0, 0, 0];
                    Physics.updateRaycol(objectItem, function(functionRaycol) {
                        var objectPlayer = null;
                        if (void 0 === functionRaycol.strIdent) functionRaycol.strIdent = Object.keys(Player.objectPlayer);
                        do {
                            objectPlayer = Player.objectPlayer[functionRaycol.strIdent.pop()];
                            if (void 0 === objectPlayer) return null;
                            if (objectPlayer.strIdent !== objectItem.strPlayer) {
                                var dblDistanceX = objectPlayer.dblPosition[0] - objectItem.dblPosition[0];
                                var dblDistanceY = objectPlayer.dblPosition[1] - objectItem.dblPosition[1];
                                var dblDistanceZ = objectPlayer.dblPosition[2] - objectItem.dblPosition[2];
                                if (!(Math.sqrt(dblDistanceX * dblDistanceX + dblDistanceY * dblDistanceY + dblDistanceZ * dblDistanceZ) > Constants.dblInteractionSwordRange)) break;
                                else;
                            } else;
                        } while (true);
                        objectPlayer.dblSize = Constants.dblPlayerHitbox;
                        return objectPlayer
                    }, function(objectPlayer) {
                        Gameserver.playerHit(objectPlayer, objectItem)
                    })
                } else if ("weaponBow" === objectData.strWeapon) {
                    var strIdent = "itemArrow - " + Node.hashbase(Node.requireCrypto.randomBytes(16)).substr(0, 8);
                    var strPlayer = Player.objectPlayer[objectSocket.strIdent].strIdent;
                    var dblPosition = [0, 0, 0];
                    var dblVerlet = [0, 0, 0];
                    var dblAcceleration = [0, 0, 0];
                    var dblRotation = [0, 0, 0];
                    dblPosition[0] = Player.objectPlayer[objectSocket.strIdent].dblPosition[0] + .25 * Math.sin(Player.objectPlayer[objectSocket.strIdent].dblRotation[1] + .5 * Math.PI);
                    dblPosition[1] = Player.objectPlayer[objectSocket.strIdent].dblPosition[1] + .1;
                    dblPosition[2] = Player.objectPlayer[objectSocket.strIdent].dblPosition[2] + .25 * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[1] + .5 * Math.PI);
                    dblVerlet[0] = dblPosition[0];
                    dblVerlet[1] = dblPosition[1];
                    dblVerlet[2] = dblPosition[2];
                    dblAcceleration[0] = -1 * Math.sin(Player.objectPlayer[objectSocket.strIdent].dblRotation[1]) * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[2]);
                    dblAcceleration[1] = -1 * Math.sin(Player.objectPlayer[objectSocket.strIdent].dblRotation[2] + 1 * Math.PI);
                    dblAcceleration[2] = -1 * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[1]) * Math.cos(Player.objectPlayer[objectSocket.strIdent].dblRotation[2]);
                    dblRotation[0] = Player.objectPlayer[objectSocket.strIdent].dblRotation[0];
                    dblRotation[1] = Player.objectPlayer[objectSocket.strIdent].dblRotation[1];
                    dblRotation[2] = Player.objectPlayer[objectSocket.strIdent].dblRotation[2];
                    Item.objectItem[strIdent] = {
                        strIdent: strIdent,
                        strPlayer: strPlayer,
                        dblPosition: dblPosition,
                        dblVerlet: dblVerlet,
                        dblAcceleration: dblAcceleration,
                        dblRotation: dblRotation
                    }
                }
            }
    });
    objectSocket.on("disconnect", function() {
        ScriptManager.callPlayerQuitEvent(objectSocket);
        delete Player.objectPlayer[objectSocket.strIdent]
    })
});
var Constants = {
    intGameLoop: 16,
    dblGameScale: .04,
    dblGameBlocksize: 1,
    intPlayerHealth: 100,
    dblPlayerMovement: [.03, .18, .03],
    dblPlayerSize: [.9, 1.6, .9],
    dblPlayerGravity: [0, -.01, 0],
    dblPlayerMaxvel: [.08, .26, .08],
    dblPlayerFriction: [.8, 1, .8],
    dblPlayerHitbox: [.4, .9, .4],
    intInteractionPickaxeDuration: 30,
    intInteractionSwordDuration: 30,
    intInteractionSwordDamage: 20,
    dblInteractionSwordImpact: [.11, .11, .11],
    dblInteractionSwordRange: 2,
    intInteractionBowDuration: 30,
    intInteractionBowDamage: 20,
    dblInteractionBowImpact: [.11, .11, .11],
    dblFlagSize: [1, 1, 1],
    dblFlagGravity: [0, -.01, 0],
    dblFlagMaxvel: [.08, .26, .08],
    dblFlagFriction: [.8, 1, .8],
    dblFlagRotate: .02,
    dblArrowSize: [.3, .3, .3],
    dblArrowGravity: [0, -.001, 0],
    dblArrowMaxvel: [.36],
    dblArrowFriction: [1, 1, 1]
};
var Physics = require(__dirname + "/assets/libPhysics.js");
var objectBrowserify = {
    Constants: Constants,
    Voxel: null,
    Physics: Physics,
    Input: null
};
Physics.browserify(objectBrowserify);
var World = require(__dirname + "/assets/libWorld.js");
var Player = require(__dirname + "/assets/libPlayer.js");
var Item = require(__dirname + "/assets/libItem.js");
var objectBrowserify = {
    Constants: Constants,
    Voxel: null,
    Physics: Physics,
    Input: null,
    World: World,
    Player: Player,
    Item: Item
};
World.browserify(objectBrowserify);
Player.browserify(objectBrowserify);
Item.browserify(objectBrowserify);
var Gameserver = {
    strName: "",
    strLoginPassword: "",
    intLoginPassword: 0,
    strLoginMotd: "",
    strPhaseActive: "",
    intPhaseRound: 0,
    intPhaseRemaining: 0,
    strWorldAvailable: [],
    strWorldActive: "",
    strWorldFingerprint: "",
    intPlayerActive: 0,
    intPlayerCapacity: 0,
    intScoreRed: 0,
    intScoreBlue: 0,
    init: function() {
        Gameserver.strName = VoxConf.strName;
        Gameserver.strLoginPassword = VoxConf.strLoginPassword;
        Gameserver.intLoginPassword = "" === VoxConf.strLoginPassword ? 0 : 1;
        Gameserver.strLoginMotd = VoxConf.strLoginMotd;
        Gameserver.strPhaseActive = "Build";
        Gameserver.intPhaseRound = VoxConf.intPhaseRound;
        Gameserver.intPhaseRemaining = VoxConf.intPhaseRemaining;
        Gameserver.strWorldAvailable = VoxConf.strWorldAvailable;
        Gameserver.strWorldActive = Gameserver.strWorldAvailable[(Gameserver.strWorldAvailable.indexOf(Gameserver.strWorldActive) + 1) % Gameserver.strWorldAvailable.length];
        Gameserver.strWorldFingerprint = "";
        Gameserver.intPlayerCapacity = VoxConf.intPlayerCapacity;
        Gameserver.intPlayerActive = 0;
        Gameserver.intScoreRed = 0;
        Gameserver.intScoreBlue = 0
    },
    dispel: function() {
        Gameserver.strName = "";
        Gameserver.strLoginPassword = "";
        Gameserver.intLoginPassword = 0;
        Gameserver.strLoginMotd = "";
        Gameserver.strPhaseActive = "";
        Gameserver.intPhaseRound = 0;
        Gameserver.intPhaseRemaining = 0;
        Gameserver.strWorldAvailable = [];
        Gameserver.strWorldActive = "";
        Gameserver.strWorldFingerprint = "";
        Gameserver.intPlayerCapacity = 0;
        Gameserver.intPlayerActive = 0;
        Gameserver.intScoreRed = 0;
        Gameserver.intScoreBlue = 0
    },
    phaseUpdate: function() {
        Gameserver.intPhaseRemaining = Math.max(0, Gameserver.intPhaseRemaining - Constants.intGameLoop);
        if (0 === Gameserver.intPhaseRemaining) {
            if ("Build" === Gameserver.strPhaseActive) {
                Gameserver.strPhaseActive = "Combat";
                Gameserver.intPhaseRound -= 0;
                Gameserver.intPhaseRemaining = VoxConf.intPhaseRemaining
            } else if ("Combat" === Gameserver.strPhaseActive) {
                Gameserver.strPhaseActive = "Build";
                Gameserver.intPhaseRound -= 1;
                Gameserver.intPhaseRemaining = VoxConf.intPhaseRemaining
            }
            if (0 === Gameserver.intPhaseRound) {
                Gameserver.strPhaseActive = "Build";
                Gameserver.intPhaseRound = VoxConf.intPhaseRound;
                Gameserver.intPhaseRemaining = VoxConf.intPhaseRemaining;
                Gameserver.strWorldActive = Gameserver.strWorldAvailable[(Gameserver.strWorldAvailable.indexOf(Gameserver.strWorldActive) + 1) % Gameserver.strWorldAvailable.length];
                Gameserver.strWorldFingerprint = "";
                Gameserver.intScoreRed = 0;
                Gameserver.intScoreBlue = 0
            }
        }
    },
    worldUpdate: function() {
        var boolGood = true;
        if (0 !== Gameserver.strWorldFingerprint.indexOf(Gameserver.strWorldActive)) {
            boolGood = false;
            World.loadBuffer(null, Node.requireFs.readFileSync(__dirname + "/worlds/" + Gameserver.strWorldActive + ".txt").toString());
            for (var intFor1 = 0; intFor1 < World.intFlagRed.length; intFor1 += 1) {
                var intCoordinate = World.intFlagRed[intFor1];
                World.updateDestroy(intCoordinate)
            }
            for (var intFor1 = 0; intFor1 < World.intFlagBlue.length; intFor1 += 1) {
                var intCoordinate = World.intFlagBlue[intFor1];
                World.updateDestroy(intCoordinate)
            }
        } else if (0 !== Gameserver.strWorldFingerprint.indexOf(Gameserver.strWorldActive + " - " + Gameserver.strPhaseActive)) {
            boolGood = false;
            if ("Build" === Gameserver.strPhaseActive)
                for (var intFor1 = 0; intFor1 < World.intSeparator.length; intFor1 += 1) {
                    var intCoordinate = World.intSeparator[intFor1];
                    World.updateCreate(intCoordinate, "voxelSeparator", true)
                } else if ("Combat" === Gameserver.strPhaseActive)
                    for (var intFor1 = 0; intFor1 < World.intSeparator.length; intFor1 += 1) {
                        var intCoordinate = World.intSeparator[intFor1];
                        World.updateDestroy(intCoordinate)
                    }
        }
        if (false === boolGood) {
            Gameserver.strWorldFingerprint = Gameserver.strWorldActive + " - " + Gameserver.strPhaseActive + " - " + Gameserver.intPhaseRound;
            Item.initFlag(Item.objectItem["itemFlag - teamRed"]);
            Item.initFlag(Item.objectItem["itemFlag - teamBlue"]);
            Socket.objectServer.emit("eventWorld", {
                strBuffer: World.saveBuffer(null)
            });
            for (var strIdent in Player.objectPlayer) {
                var objectPlayer = Player.objectPlayer[strIdent];
                if ("" !== objectPlayer.strTeam) Gameserver.playerRespawn(objectPlayer);
                else;
            }
        }
    },
    playerUpdate: function() {
        Gameserver.intPlayerActive = Object.keys(Player.objectPlayer).length;
        for (var strIdent in Player.objectPlayer) {
            var objectPlayer = Player.objectPlayer[strIdent];
            if ("" !== objectPlayer.strTeam) {
                if (objectPlayer.intHealth < 1) {
                    var event = ScriptManager.callPlayerDeathEvent(objectPlayer);
                    if (!event.isCanceled()) {
                        objectPlayer.intDeaths += 1;
                        Gameserver.playerRespawn(objectPlayer)
                    }
                } else if (objectPlayer.dblPosition[1] < 2 * Constants.dblGameBlocksize) {
                    objectPlayer.intHealth -= 10;
                    Socket.objectServer.emit("eventPlayer", {
                        strBuffer: Player.saveBuffer(null)
                    })
                }
            } else;
        }
    },
    playerRespawn: function(objectPlayer) {
        objectPlayer.strEntity = "";
        objectPlayer.intHealth = Constants.intPlayerHealth;
        var intSpawn = [];
        if ("teamRed" === objectPlayer.strTeam) intSpawn = World.intSpawnRed[Math.floor(Math.random() * World.intSpawnRed.length)];
        else if ("teamBlue" === objectPlayer.strTeam) intSpawn = World.intSpawnBlue[Math.floor(Math.random() * World.intSpawnBlue.length)];
        objectPlayer.dblPosition[0] = intSpawn[0] + .5;
        objectPlayer.dblPosition[1] = intSpawn[1] + 2;
        objectPlayer.dblPosition[2] = intSpawn[2] + .5;
        objectPlayer.dblVerlet[0] = objectPlayer.dblPosition[0];
        objectPlayer.dblVerlet[1] = objectPlayer.dblPosition[1];
        objectPlayer.dblVerlet[2] = objectPlayer.dblPosition[2];
        objectPlayer.objectSocket.emit("eventPlayerRespawn", {
            dblPosition: objectPlayer.dblPosition,
            dblVerlet: objectPlayer.dblVerlet
        });
        if (Item.objectItem["itemFlag - teamRed"].strPlayer === objectPlayer.strIdent) Item.objectItem["itemFlag - teamRed"].strPlayer = "playerDropped";
        else if (Item.objectItem["itemFlag - teamBlue"].strPlayer === objectPlayer.strIdent) Item.objectItem["itemFlag - teamBlue"].strPlayer = "playerDropped"
    },
    playerHit: function(objectPlayer, objectItem) {
        var damage;
        if (0 === objectItem.strIdent.indexOf("itemSword")) damage = Constants.intInteractionSwordDamage;
        else if (0 === objectItem.strIdent.indexOf("itemArrow")) damage = Constants.intInteractionBowDamage;
        var event = ScriptManager.callPlayerHitEvent(objectPlayer, objectItem, damage);
        if (!event.isCanceled()) {
            damage = event.getDamage();
            objectPlayer.intHealth -= damage;
            if (0 === objectItem.strIdent.indexOf("itemSword")) {
                objectPlayer.dblAcceleration[0] = -1 * Constants.dblInteractionSwordImpact[0] * Math.sin(objectItem.dblRotation[1]) * Math.cos(objectItem.dblRotation[2]);
                objectPlayer.dblAcceleration[1] = -1 * Constants.dblInteractionSwordImpact[1] * Math.sin(objectItem.dblRotation[2] + 1 * Math.PI);
                objectPlayer.dblAcceleration[2] = -1 * Constants.dblInteractionSwordImpact[2] * Math.cos(objectItem.dblRotation[1]) * Math.cos(objectItem.dblRotation[2])
            } else if (0 === objectItem.strIdent.indexOf("itemArrow")) {
                objectPlayer.dblAcceleration[0] = -1 * Constants.dblInteractionBowImpact[0] * Math.sin(objectItem.dblRotation[1]) * Math.cos(objectItem.dblRotation[2]);
                objectPlayer.dblAcceleration[1] = -1 * Constants.dblInteractionBowImpact[1] * Math.sin(objectItem.dblRotation[2] + 1 * Math.PI);
                objectPlayer.dblAcceleration[2] = -1 * Constants.dblInteractionBowImpact[2] * Math.cos(objectItem.dblRotation[1]) * Math.cos(objectItem.dblRotation[2])
            }
            objectPlayer.objectSocket.emit("eventPlayerHit", {
                dblAcceleration: objectPlayer.dblAcceleration
            });
            if (objectPlayer.intHealth < 1)
                if (void 0 !== Player.objectPlayer[objectItem.strPlayer]) Player.objectPlayer[objectItem.strPlayer].intKills += 1
        }
    },
    itemUpdate: function() {
        for (var strIdent in Item.objectItem) {
            var objectItem = Item.objectItem[strIdent];
            if ("playerInitial" !== objectItem.strPlayer)
                if ("playerDropped" !== objectItem.strPlayer)
                    if (void 0 === Player.objectPlayer[objectItem.strPlayer]) objectItem.strPlayer = "playerDropped";
            if (0 === objectItem.strIdent.indexOf("itemFlag")) {
                objectItem.dblSize = Constants.dblFlagSize;
                Physics.updateObjectcol(objectItem, function(functionObjectcol) {
                    var objectPlayer = null;
                    if (void 0 === functionObjectcol.strIdent) functionObjectcol.strIdent = Object.keys(Player.objectPlayer);
                    do {
                        objectPlayer = Player.objectPlayer[functionObjectcol.strIdent.pop()];
                        if (void 0 === objectPlayer) return null;
                        if ("" !== objectPlayer.strTeam) break;
                        else;
                    } while (true);
                    objectPlayer.dblSize = Constants.dblPlayerHitbox;
                    return objectPlayer
                }, function(objectPlayer) {
                    if ("playerInitial" === objectItem.strPlayer) {
                        if (objectItem.strIdent.indexOf(objectPlayer.strTeam) === -1) objectItem.strPlayer = objectPlayer.strIdent;
                        else if (objectItem.strIdent.indexOf(objectPlayer.strTeam) !== -1)
                            if (Item.objectItem["itemFlag - teamBlue"].strPlayer === objectPlayer.strIdent) {
                                Item.initFlag(Item.objectItem["itemFlag - teamBlue"]);
                                Gameserver.intScoreRed += 1;
                                objectPlayer.intScore += 1
                            } else if (Item.objectItem["itemFlag - teamRed"].strPlayer === objectPlayer.strIdent) {
                            Item.initFlag(Item.objectItem["itemFlag - teamRed"]);
                            Gameserver.intScoreBlue += 1;
                            objectPlayer.intScore += 1
                        }
                    } else if ("playerDropped" === objectItem.strPlayer)
                        if (objectItem.strIdent.indexOf(objectPlayer.strTeam) === -1) objectItem.strPlayer = objectPlayer.strIdent;
                        else if (objectItem.strIdent.indexOf(objectPlayer.strTeam) !== -1) Item.initFlag(objectItem)
                })
            } else if (0 === objectItem.strIdent.indexOf("itemArrow")) {
                objectItem.dblSize = Constants.dblArrowSize;
                Physics.updateObjectcol(objectItem, function(functionObjectcol) {
                    var objectPlayer = null;
                    if (void 0 === functionObjectcol.strIdent) functionObjectcol.strIdent = Object.keys(Player.objectPlayer);
                    do {
                        objectPlayer = Player.objectPlayer[functionObjectcol.strIdent.pop()];
                        if (void 0 === objectPlayer) return null;
                        if ("" !== objectPlayer.strTeam) {
                            if (objectPlayer.strIdent === objectItem.strPlayer) continue;
                            break
                        } else;
                    } while (true);
                    objectPlayer.dblSize = Constants.dblPlayerHitbox;
                    return objectPlayer
                }, function(objectPlayer) {
                    Gameserver.playerHit(objectPlayer, objectItem);
                    delete Item.objectItem[objectItem.strIdent]
                })
            }
        }
    }
};
Gameserver.init();
Physics.init();
Physics.functionWorldcol = function(intCoordinateX, intCoordinateY, intCoordinateZ) {
    if (0 === intCoordinateY) return true;
    else if (void 0 !== World.objectWorld[(intCoordinateX << 20) + (intCoordinateY << 10) + (intCoordinateZ << 0)]) return true;
    return false
};
World.init();
Player.init();
Item.init();
Item.functionFlagInit = function(objectItem) {
    objectItem.strPlayer = "playerInitial";
    var intCoordinate = [0, 0, 0];
    if (objectItem.strIdent.indexOf("teamRed") !== -1) intCoordinate = World.intFlagRed[Math.floor(Math.random() * World.intFlagRed.length)];
    else if (objectItem.strIdent.indexOf("teamBlue") !== -1) intCoordinate = World.intFlagBlue[Math.floor(Math.random() * World.intFlagBlue.length)];
    objectItem.dblPosition[0] = intCoordinate[0] + .5;
    objectItem.dblPosition[1] = intCoordinate[1] + .5;
    objectItem.dblPosition[2] = intCoordinate[2] + .5;
    objectItem.dblVerlet[0] = objectItem.dblPosition[0];
    objectItem.dblVerlet[1] = objectItem.dblPosition[1];
    objectItem.dblVerlet[2] = objectItem.dblPosition[2]
};
Item.functionFlagPlayer = function(objectItem) {
    if (void 0 !== Player.objectPlayer[objectItem.strPlayer]) {
        objectItem.dblPosition[0] = Player.objectPlayer[objectItem.strPlayer].dblPosition[0];
        objectItem.dblPosition[1] = Player.objectPlayer[objectItem.strPlayer].dblPosition[1] + 1;
        objectItem.dblPosition[2] = Player.objectPlayer[objectItem.strPlayer].dblPosition[2];
        objectItem.dblVerlet[0] = objectItem.dblPosition[0];
        objectItem.dblVerlet[1] = objectItem.dblPosition[1];
        objectItem.dblVerlet[2] = objectItem.dblPosition[2]
    }
};
var Animationframe_intTimestamp = (new Date).getTime();
var functionAnimationframe = function() {
    if (0 === Gameserver.intPlayerActive) {
        Gameserver.strPhaseActive = "Build";
        Gameserver.intPhaseRound = VoxConf.intPhaseRound;
        Gameserver.intPhaseRemaining = VoxConf.intPhaseRemaining;
        Gameserver.strWorldFingerprint = "";
        Gameserver.intScoreRed = 0;
        Gameserver.intScoreBlue = 0
    } else if (0 !== Gameserver.intPlayerActive) {
        Gameserver.phaseUpdate();
        World.update();
        Gameserver.worldUpdate()
    }
    Player.update();
    Gameserver.playerUpdate();
    Item.update();
    Gameserver.itemUpdate();
    Socket.objectServer.emit("eventPlayer", {
        strBuffer: Player.saveBuffer(null)
    });
    Socket.objectServer.emit("eventItem", {
        strBuffer: Item.saveBuffer(null)
    });
    var intWait = Constants.intGameLoop - ((new Date).getTime() - Animationframe_intTimestamp);
    if (intWait >= 1) setTimeout(functionAnimationframe, intWait);
    else if (intWait < 1) setImmediate(functionAnimationframe);
    Animationframe_intTimestamp = (new Date).getTime()
};
setTimeout(functionAnimationframe, Constants.intGameLoop);
var functionInterval = function() {
    var functionAdvertise = function() {
        if (true === VoxConf.boolAdvertise) functionRequest();
        else if (true === VoxConf.boolAdvertise) functionSuccess()
    };
    var functionRequest = function() {
        var objectClientrequest = Node.requireHttp.request({
            host: "www.voxel-warriors.com",
            port: 80,
            path: "/host.xml?intPort=" + encodeURIComponent(NodeConf.intExpressPort) + "&strName=" + encodeURIComponent(Gameserver.strName) + "&intLoginPassword=" + encodeURIComponent(Gameserver.intLoginPassword) + "&strWorldActive=" + encodeURIComponent(Gameserver.strWorldActive) + "&intPlayerCapacity=" + encodeURIComponent(Gameserver.intPlayerCapacity) + "&intPlayerActive=" + encodeURIComponent(Gameserver.intPlayerActive),
            method: "GET"
        }, function(objectClientresponse) {
            objectClientresponse.setEncoding("UTF-8");
            objectClientresponse.on("data", function(strData) {});
            objectClientresponse.on("end", function() {
                functionSuccess()
            })
        });
        objectClientrequest.on("error", function(objectError) {
            functionError()
        });
        objectClientrequest.setTimeout(6e4, function() {
            objectClientrequest.abort()
        });
        objectClientrequest.end()
    };
    var Errorsuccess_intTimestamp = (new Date).getTime();
    var functionError = function() {
        Node.log(["VoxRect", String((new Date).getTime() - Errorsuccess_intTimestamp), "Error"])
    };
    var functionSuccess = function() {
        Node.log(["VoxRect", String((new Date).getTime() - Errorsuccess_intTimestamp), "Success"])
    };
    functionAdvertise()
};
setInterval(functionInterval, 3e5);
functionInterval();
