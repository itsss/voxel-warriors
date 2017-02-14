/*jslint esversion: 6*/
function onPlayerChat(event){
	let human = event.getHuman();
	let cmd = event.getMessage();
	if (cmd.indexOf('/do ') !== -1){
		let pos = human.getPosition().slice();
		let yaw = human.getRotation()[1];
		let pitch = human.getRotation()[2];
		let rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
		console.log(rotate);
		cmd = cmd.split('/do ')[1].split('');
		let type = "voxelBrick";
		for (let i of cmd){
			if (i === 's'){//앞으로 1칸
				pos[0] += rotate[0];
				pos[2] += rotate[2];
				Server.setBlock(pos.slice(), type);
			}else if (i === 'd'){//아래로 1칸
				pos[1] -= 1;
				Server.setBlock(pos.slice(), type);
			}else if (i === 'u'){//위로 1칸
				pos[1] += 1;
				Server.setBlock(pos.slice(), type);
			}else if (i === 'r'){//오른쪽으로 회전 후 전진
				yaw -= Math.PI / 2;
				rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
				pos[0] += rotate[0];
				pos[2] += rotate[2];
				Server.setBlock(pos.slice(), type);
			}else if (i === 'l'){//왼쪽으로 회전 후 전진
				yaw += Math.PI / 2;
				rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
				pos[0] += rotate[0];
				pos[2] += rotate[2];
				Server.setBlock(pos.slice(), type);
			}else if (i === 'R'){//오른쪽으로 회전
				yaw -= Math.PI / 2;
				rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
			}else if (i === 'L'){//왼쪽으로 회전
				yaw += Math.PI / 2;
				rotate = [Math.round(-Math.sin(yaw)), Math.round(Math.sin(pitch)), Math.round(-Math.cos(yaw))];
			}else if (i === 'h'){//투명블럭 생성 (블럭 제거)
				type = null;
			}else if (i === 'c'){//벽돌블럭 생성
				type = "voxelBrick";
			}
		}
	}
}
///srssuurrssuurrsshsddddcsuuuuhscdhscdhscdhscduuuuhsddddcsuuuuhsdddcdssuuuu
