var undo = [];
function javamal(data, human, save, pos, yaw, pitch, rotate, type, undonum) {
    try {
        var number = "";
        for (var i = 0; i < data.length; i++) {
            if (data[i] === '(') {
                var calculate = data.substring(i + 1, data.length).split(')')[0];
                console.log("1", calculate);
                var changed = false;
                for (var j in playerVariable[human.getHumanIdent()]) {
                    if (calculate === j) {
                        data = data.replace("(" + calculate + ")", playerVariable[human.getHumanIdent()][j]);
                        console.log("2", data);
                        changed = true;
                        break;
                    }
                }
                if (!changed) {
                    data = data.replace("(" + calculate + ")", "@");
                    console.log("3", data);
                    if (calculate.startsWith("##")) {
                        type = calculate.replace('##', '');
                    } else {
                        for (var j in playerVariable[human.getHumanIdent()]) {
                            calculate = calculate.split(j).join("playerVariable['" + human.getHumanIdent() + "']['" + j + "']");
                        }
                        console.log("4", calculate);
                        eval(calculate);
                    }
                }
                console.log("Data[i]", data[i]);
            }
            if (!isNaN(data[i])) {
                number += data[i];
            } else {
                if (isNaN(number) || number === "") number = 1;
                else number = parseInt(number);
                if (data[i] === '<') {
                    var match = 1;
                    var close;
                    for (var k = i + 1; k < data.length; k++) {
                        if (data[k] === '<') match++;
                        else if (data[k] === '>') match--;
                        if (match === 0) {
                            close = k;
                            break;
                        }
                    }
                    if (close !== undefined) {
                        console.log("javamal", data.substring(i + 1, close));
                        for (var j = 0; j < number; j++) javamal(data.substring(i + 1, close), human, save, pos, yaw, pitch, rotate, type, undonum);
                        i += close - i;
                    }
                } else
                    for (var j = 0; j < number; j++) {
                        if (data[i] === 's') { //앞으로 1칸
                            pos[0] += rotate[0];
                            pos[2] += rotate[2];
                            Server.setBlock(pos.slice(), type);
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                        } else if (data[i] === 'd') { //아래로 1칸
                            pos[1] -= 1;
                            Server.setBlock(pos.slice(), type);
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                        } else if (data[i] === 'u') { //위로 1칸
                            pos[1] += 1;
                            Server.setBlock(pos.slice(), type);
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                        } else if (data[i] === 'r') { //오른쪽 1
                            yaw -= Math.PI / 2;
                            pos[0] += Math.round(-Math.sin(yaw));
                            pos[2] += Math.round(-Math.cos(yaw));
                            Server.setBlock(pos.slice(), type);
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                            yaw += Math.PI / 2;
                        } else if (data[i] === 'l') { //왼쪽 1
                            yaw += Math.PI / 2;
                            pos[0] += Math.round(-Math.sin(yaw));
                            pos[2] += Math.round(-Math.cos(yaw));
                            Server.setBlock(pos.slice(), type);
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                            yaw -= Math.PI / 2;
                        } else if (data[i] === 'R') { //오른쪽으로 회전
                            yaw -= Math.PI / 2;
                            rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
                        } else if (data[i] === 'L') { //왼쪽으로 회전
                            yaw += Math.PI / 2;
                            rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
                        } else if (data[i] === 'h') { //투명블럭 생성 (블럭 제거)
                            type = null;
                        } else if (data[i] === 'c') { //벽돌블럭 생성
                            type = "voxelBrick";
                        } else if (data[i] === 'S') { //앞으로 1칸, 모양 변경
                            pos[0] += rotate[0];
                            pos[2] += rotate[2];
                            Server.setBlock(pos.slice(), "voxelBrick");
							undo[human.getHumanIdent()][undonum].push(pos.slice());
                        } else if (data[i] === '[') {
                            console.log("[", save);
                            save.push({
                                pos: pos.slice(),
                                yaw: yaw
                            });
                        } else if (data[i] === ']') {
                            console.log("]", save);
                            for (var j = 0; j < 3; j++) pos[j] = save[save.length - 1].pos[j];
                            yaw = save[save.length - 1].yaw;
                            rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
                            save.splice(save.length - 1, 1);
                        }
                    }
                number = "";
            }
        }
    } catch (e) {
        human.sendMessage("[Error]", e);
    }
}

var playerPromise = [];
var playerVariable = [];

function onPlayerChat(event) {
    if (!event.getMessage().startsWith('/')) return;
    event.setCanceled();
    var cmd = event.getMessage().split('/')[1];
    var human = event.getHuman();
    var data = cmd.split(' ');
    if (data[0].startsWith("do")) {
        try {
            var _playerPromise = [],
                _playerVariable = [];
            for (var i in playerPromise) {
                _playerPromise[i] = [];
                for (var j in playerPromise[i]) {
                    _playerPromise[i][j] = playerPromise[i][j];
                }
            }
            for (var i in playerVariable) {
                _playerVariable[i] = [];
                for (var j in playerVariable[i]) {
                    _playerVariable[i][j] = playerVariable[i][j];
                }
            }
            var maxPlay = 1;
            if (data[0].indexOf('_') !== -1) maxPlay = parseInt(data[0].split('_')[1]);
            data.splice(0, 1);
            var mal = data.join(' ');
            for (var i = 0; i < maxPlay; i++) {
                for (var j in playerPromise[human.getHumanIdent()]) mal = mal.split(j).join("<" + playerPromise[human.getHumanIdent()][j] + ">");
            }
            console.log(mal);
            var save = [];
            var pos = human.getPosition().slice();
            var yaw = human.getRotation()[1];
            var pitch = human.getRotation()[2];
            var rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
            var type = "voxelDirt";
			if (undo[human.getHumanIdent()] === undefined) undo[human.getHumanIdent()] = [];
			undo[human.getHumanIdent()].push([]);
            javamal(mal, human, save, pos, yaw, pitch, rotate, type, undo[human.getHumanIdent()].length - 1);
            playerPromise = _playerPromise;
            playerVariable = _playerVariable;
            human.sendMessage("[JavaMAL]", cmd + " 실행 완료!");
        } catch (e) {
            human.sendMessage("[Error]", e);
        }
    } else if (data[0] === "promise") {
        try {
            if (data[1].length !== 1) {
                human.sendMessage("[Error]", "함수 / 변수명은 한 글자여야 합니다.");
                return;
            }
            if (isNaN(data[2])) {
                if (playerPromise[human.getHumanIdent()] === undefined) playerPromise[human.getHumanIdent()] = [];
                playerPromise[human.getHumanIdent()][data[1]] = data[2];
                human.sendMessage("[JavaMAL]", data[1] + "을(를) " + data[2] + "(으)로 약속했어요!");
            } else {
                if (playerVariable[human.getHumanIdent()] === undefined) playerVariable[human.getHumanIdent()] = [];
                playerVariable[human.getHumanIdent()][data[1]] = data[2];
                human.sendMessage("[JavaMAL]", data[1] + "을(를) " + data[2] + "(으)로 정의했어요!");
            }
        } catch (e) {
            human.sendMessage("[Error]", e);
        }
    } else if (data[0] === "undo"){
		if (undo[human.getHumanIdent()].length === 0){
			human.sendMessage("[Error]", "되돌릴 내용이 없습니다.");
			return;
		}
		var leng = undo[human.getHumanIdent()].length - 1;
		for (var i in undo[human.getHumanIdent()][leng]){
			Server.setBlock(undo[human.getHumanIdent()][leng][i], null);
		}
		human.sendMessage("[JavaMAL]", undo[human.getHumanIdent()][leng].length + "개의 블럭을 되돌렸습니다.");
		undo[human.getHumanIdent()].splice(leng, 1);
	} else if (data[0] === "forceundo"){
		var player = Server.getPlayer(data[1]);
		if (player === undefined){
			human.sendMessage("[Error]", data[1] + " 님을 찾을 수 없습니다..");
			return;
		}
		if (undo[player.getHumanIdent()].length === 0){
			human.sendMessage("[Error]", "되돌릴 내용이 없습니다.");
			return;
		}
		var leng = undo[player.getHumanIdent()].length - 1;
		for (var i in undo[player.getHumanIdent()][leng]){
			Server.setBlock(undo[player.getHumanIdent()][leng][i], null);
		}
		human.sendMessage("[JavaMAL]", undo[player.getHumanIdent()][leng].length + "개의 블럭을 되돌렸습니다.");
		undo[player.getHumanIdent()].splice(leng, 1);
	}
}
///srssuurrssuurrsshsddddcsuuuuhscdhscdhscdhscduuuuhsddddcsuuuuhsdddcdssuuuu
