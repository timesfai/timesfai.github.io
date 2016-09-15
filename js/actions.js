// JScript File

//Constants
var SUCCESS = 0;
var ERROR = 1;
var NOT_READY = 2; //Need to wait for more resources
var RETRY = 3; //未打開


//Class BaseWorkflow
function BaseWorkflow() {
	//Constructor, put Member Variables here.
	this.callerObj = null;
	this.callbackFunction = null;
	this.status = null;
}
BaseWorkflow.Extends(null, {
	//Prototype, put Member Functions here.
	run: function(callerObj, callbackFunction) {
		this.callerObj = callerObj;
		this.callbackFunction = callbackFunction;
		this.start();
	},
	start: function() {},
	end: function(status) {
		this.status = status;
		if (this.callbackFunction)
			this.callbackFunction.apply(this.callerObj, [this]); //arguments
	}
});
//****** end of Class ******


//Class BaseHttpAction
function BaseHttpAction(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	//netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"); 
	this.villageId = villageId;
	this.serverURL = "http://" + g_sServerURL + "/";
	this.ajaxReq = new AjaxRequestText();
	//try { netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"); } catch (e) { alert("Permission UniversalBrowserRead denied."); }

}
BaseHttpAction.Extends(BaseWorkflow, {
	//Prototype, put Member Functions here.
	sendRequest: function(url, params, nextStep) {
		if (this.villageId) {
			url += (url.indexOf("?") > 0) ? "&" : "?";
			url += "newdid=" + this.villageId;
		}
		//postMessage("1:"+this.serverURL+url);
		//postMessage("2:"+params);
		this.ajaxReq.send(this.serverURL + url, params, this, nextStep);
		//if (params)
		//	postDebug("params="+params);
	}
});
//****** end of Class ******


//Class LoginAction
function LoginAction(villageId, username, password) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.username = username;
	this.password = password;

}
LoginAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		postMessage("登錄:" + this.username);
		this.sendRequest("login.php", null, this.loginAction1);
	},
	loginAction1: function(doc) {
		//var form = getStrBetween(doc, '<form method="post" name="snd" action="dorf1.php">', '</form>',2000);
		var form = getStrBetween(doc, '<form name="login" method=', '</form>', 2000);
		if (form.length == 0) {
			postError("未打開 登錄 頁面");
			this.end(ERROR);
			return;
		}

		var param = "";
		for (var i = 0; i < 7; i++) {
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "password") {
				if (type == "text")
					value = this.username;
				if (type == "password")
					value = this.password;
				param += name + "=" + value + "&";
			}
			if (type == "Checkbox") {
				param += name + "=" + value;
			}
			form = startFromStr(form, input, 2000);
		}

		this.sendRequest("dorf1.php", param, this.loginAction2);
	},
	loginAction2: function(doc) {
		if (doc.indexOf("密碼錯誤") >= 0) {
			postError("密碼錯誤");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("名稱不存在") >= 0) {
			postError("用戶名不存在");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("請不要選擇記住我的帳號及密碼") >= 0) { //登錄失敗
			postError("登錄失敗");
			this.end(ERROR);
			return;
		}

		postMessage("登錄成功");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class CheckLoginAction
function CheckLoginAction(villageId, username, password) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.username = username;
	this.password = password;
}
CheckLoginAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		postDebug("CheckLoginAction: " + this.username, this);
		this.sendRequest("dorf3.php", null, this.action1);
	},
	action1: function(doc) {
		if (doc.indexOf("低流量或手機版本") >= 0) { //Goto LoginAction
			var action = new LoginAction(null, this.username, this.password);
			action.run(this, this.loginResult);
			return;
		}
		if (doc.indexOf("dorf1.php?ok") >= 0) {
			postError("服務器貼出公告，請先閱讀確認，再來重新開始機器人");
			this.end(ERROR);
			return;
		}

		if (doc.indexOf('<h1 class="titleInHeader">') >= 0) {
			postMessage("Check Login 正常");
			this.end(SUCCESS);
			return;
		} else {
			postError("Check Login 未知錯誤");
			this.end(ERROR);
			return;
		}
	},
	loginResult: function(action) {
		this.end(action.status); //SUCCESS or ERROR
	}
});
//****** end of Class ******


//Class BuildAction
function BuildAction(villageId, buildingId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.buildingId = buildingId;
}
BuildAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		postDebug("準備建: " + this.buildingId + " 號", this);
		this.sendRequest("build.php?id=" + this.buildingId, null, this.buildAction1);
	},
	buildAction1: function(doc) {
		if (doc.indexOf('<span class="c">資源不足</span>') >= 0 || doc.indexOf('資源何時充足時間提示') >= 0) {
			postMessage("資源不足");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("已經有建築在建造中") >= 0 || doc.indexOf("等待隊列中") >= 0) {
			postMessage("已經有建築在建造中");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("糧食產量不足: 需要先建造一個農場") >= 0) {
			postError("糧食產量不足: 需要先建造一個農場");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造所需資源超過倉庫容量上限,請先升級你的倉庫") >= 0) {
			postError("建造所需資源超過倉庫容量上限,請先升級你的倉庫");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造完成") >= 0 || doc.indexOf("將馬上開始全部建造") >= 0) {
			postError("建造完成");
			this.end(ERROR);
			return;
		}

		var info;
		if (doc.indexOf("dorf1.php?a=") >= 0) {
			//Building Outer Town
			info = getStrBetween(doc, "dorf1.php?a=", '">', null); //<a href="dorf1.php?a=12&c=5a1">升級到等級4</a>
			this.sendRequest("dorf1.php?a=" + info, null, this.buildAction2);
		} else if (doc.indexOf("dorf2.php?a=") >= 0) {
			//Building inner Town
			info = getStrBetween(doc, "dorf2.php?a=", '">', null); //<a href="dorf2.php?a=29&c=cf1">升級到等級5</a>
			this.sendRequest("dorf2.php?a=" + info, null, this.buildAction2);
		} else {
			postMessage("未打開 建築/礦田 頁面,信息: " + getStrBetween(doc, '<span class="c">', '</span>', null)); //<span class="c">資源不足</span>
			this.end(RETRY);
			return;
		}

		info = getStrBetween(doc, "<h1><b>", '</b></h1>', null); //<h1><b>農場 等級 3</b></h1>
		postMessage("升級 " + this.buildingId + " 號建築: " + info);
	},
	buildAction2: function(doc) {
		if (doc.indexOf("建造中") < 0) {
			postMessage("未打開 建造成功 頁面");
		}
		this.doc = doc; //returns doc to BuildVillageAction
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class BuildVillageAction
function BuildVillageAction(villageId, buildQueue) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.buildQueue = buildQueue;
	this.buildId = null;
	this.busySeconds = 0;
}
BuildVillageAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		if (this.buildQueue && this.buildQueue.length > 0) {
			this.buildId = this.buildQueue[0];
		} else {
			this.buildId = null; //if no specified ID, auto build resources.
		}

		var url;
		if (1 <= this.buildId && this.buildId <= 18 || this.buildId == null) {
			url = "dorf1.php";
		} else if (19 <= this.buildId && this.buildId <= 40) {
			url = "dorf2.php";
		} else {
			postError("建築ID錯誤 " + this.buildId);
			this.end(ERROR);
			return;
		}

		if (g_romeBuild == 1 && this.buildId == null) { //羅馬內城
			postError("羅馬內城建設隊列完畢");
			this.end(ERROR);
			return;
		}
		if (g_romeBuild == 1 && this.buildId <= 18) { //羅馬內城
			postError("建築ID錯誤 " + this.buildId + " 不屬於羅馬內城");
			this.end(ERROR);
			return;
		}
		if (g_romeBuild == 2 && this.buildId > 18) { //羅馬外城
			postError("建築ID錯誤 " + this.buildId + " 不屬於羅馬外城");
			this.end(ERROR);
			return;
		}

		postDebug("準備建村莊: " + this.villageId, this);
		this.sendRequest(url, null, this.action1);
	},
	action1: function(doc) {
		if (doc.indexOf("<map name=") < 0) { //<map name="rx"> or <map name="map1">
			postMessage("未打開 村莊 頁面");
			this.end(RETRY);
			return;
		}

		//In Building or Not
		this.busySeconds = 0;
		if (doc.indexOf("建造中") >= 0) {
			var info = startFromStr(doc, "建造中", 2000);
			var name;
			while (true) {
				name = getStrBetween(info, '"取消"></a></td><td>', '</td>', null); //<table ...><tr><td>...title="取消"></a></td><td>市場 (等級 14)</td>...
				if (name == "")
					break; //not found
				var inner = true;
				if (name.indexOf("伐木場") >= 0 || name.indexOf("黏土礦") >= 0 || name.indexOf("鐵礦場") >= 0 || name.indexOf("農場") >= 0)
					inner = false;
				if (g_romeBuild == 0 || (g_romeBuild == 1 && inner) || (g_romeBuild == 2 && !inner))
					break; //found
				info = startFromStr(info, ' 點</td></tr>', 2000); //try next item
			}
			if (name != "") {
				var time = getStrBetween(info, "<span id=timer", "</span>", null); //<span id=timer1>0:29:45</span> 小時	timer2	timer3
				time = startFromStr(time, ">", 200); //1>0:29:45
				if (time.indexOf("Popup(2,5)") >= 0) { //<a href="#" onClick="Popup(2,5);return false;"><span class="c0t">0:00:0<br/>
					time = "服務器 - 事件過多，瞬間阻塞 (00:00:0?)"
					this.busySeconds = RETRY_SEC; //wait 5 more seconds, will be 10 total
				} else {
					this.busySeconds = parseTime(time);
				}
				postMessage("建造中: " + name + " 還需: " + time);

				this.end(SUCCESS);
				return;
			}
		}

		//If has Queue
		if (this.buildId) {
			var action = new BuildAction(this.villageId, this.buildId);
			action.run(this, this.buildResult);
			return;
		}

		//otherwise auto build resources.
		updateData(doc);
		printStatus();

		var leastType = getLeastType();
		var mineId = getLowestMine(leastType);
		if (mineId) {
			var action = new BuildAction(this.villageId, mineId);
			action.run(this, this.buildResult);
			return;
		} else {
			this.end(ERROR);
			return;
		}
	},
	buildResult: function(action) {
		if (action.status == SUCCESS) {
			//Remove id from buildQueue, if it is the first of the queue.
			var id = action.buildingId;
			var queue = this.buildQueue;
			if (queue.length > 0 && queue[0] == id) {
				for (i = 0; i < queue.length - 1; i++) {
					queue[i] = queue[i + 1];
				}
				queue.length -= 1;
				postDebug("remove " + id + " from Queue. now Queue length = " + queue.length, this);
			}

			this.action1(action.doc);
		} else {
			this.end(action.status); //ERROR or NOT_READY or RETRY
		}
	}
});
//****** end of Class ******


//Class AttackAction
function AttackAction(villageId, target, troops, type, catapult1, catapult2) {
	//Constructor, put Member Variables here.

	this.Super = BaseHttpAction;
	this.Super(villageId);

	//attack parameters
	this.target = target;
	this.troops = troops;
	this.type = type;
	this.catapult1 = catapult1; //optional, can be null
	this.catapult2 = catapult2; //optional, can be null

	//more parameters for preciseAttack
	this.time = null;
	this.timeDiff = null;

	//results
	this.iAttackDuration = 0;
	this.targetVillage = null;
	//result for preciseAttack
	this.waiting = null;

}
AttackAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		//postMessage("準備出兵", this);
		this.sendRequest("build.php?tt=2&id=39", null, this.action1);
	},
	action1: function(doc) {
		//alert(doc);
		if (doc.indexOf("派遣軍隊") < 0) {
			postMessage("未打開 出兵 頁面 ");
			this.end(RETRY);
			return;
		}

		var param = "";
		var info1 = startFromStr(doc, 'name="timestamp"', 50);
		//var info1 = getStrBetween(doc, 'type="hidden" name="timestamp"', 'type="hidden" name="timestamp_checksum"', 40);
		param += "timestamp=" + getStrBetween(info1, 'value="', '"/>', null);
		info1 = startFromStr(doc, 'name="timestamp_checksum"', 50); //getStrBetween(doc, 'name="timestamp_checksum"', 'type="hidden" name="b"',40);

		param += "&timestamp_checksum=" + getStrBetween(info1, 'value="', '"/>', null) + "&";
		//postMessage(param);
		var troops = this.troops;
		for (property in troops) { //property = "t1"
			//var info = startFromStr(doc, 'class="text"  name="'+property+'"', 200);//t1 方陣兵
			//var info = startFromStr(doc, 'type="text" class="text"\r\nclass="text" name="'+property+'"\r\nvalue="" ', 200);//t1 方陣兵
			//var info = startFromStr(doc, 'type="text"\r\nclass="text" name="'+property+'"\r\nvalue="" ', 200);//t1 方陣兵
			//var info = startFromStr(doc, 'type="text"', 200);//t1 方陣兵

			//var iCount = parseDecimal( getStrBetween(info, ">(", ")<", null) );

			//var min;
			//var max;
			//if ( troops[property] instanceof Array ) {
			//min = troops[property][0];
			//max = troops[property][1];
			//} else if ( !isNaN(troops[property]) ) {
			//min = troops[property];
			//max = troops[property];
			//} else {
			//postError("部隊類型 "+property+" 輸入數量錯誤:"+troops[property]);
			//this.end(ERROR);
			//return;
			//}
			//if ( iCount < min ) {
			//	postMessage("士兵不夠,等待,現有 "+property+" "+iCount+"個");
			//	this.end(NOT_READY);
			//	return;
			//}
			//if ( iCount > max )
			//	iCount = max;

			//param += property+"="+iCount+"&";//t1=100&
			param += property + "=" + troops[property] + "&"; //t1=100&
			//postMessage(param);
		}
		var coord = getCoordinate(this.target);
		param += "b=1&"; //hidden param
		param += "c=" + this.type + "&"; //方式:3普通/偵察 4搶奪
		param += "x=" + coord.x + "&"; //座標x
		param += "y=" + coord.y + "&"; //座標y
		param += "dname="; //村莊名字

		postMessage("出兵:　" + this.target); //(-183|-164)
		this.sendRequest("build.php?tt=2&id=39", param, this.action2);
	},
	action2: function(doc) {
		if (doc.indexOf("這個座標沒有村莊") >= 0) {
			postMessage("在這個座標沒有任何村莊");
			switchToNextTarget();
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("因違反規則而被封鎖") >= 0) {
			postMessage("帳戶因爲違規而被凍結");
			switchToNextTarget();
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("未被激活") >= 0) {
			postMessage("帳戶未被激活");
			switchToNextTarget();
			this.end(SUCCESS);
			return;
		}
		if (doc.indexOf("初學者保護直到") >= 0) {
			postMessage("初級玩家保護期" + getStrBetween(doc, "初級玩家保護期", "</span>", null)); //初級玩家保護期到 07/07/26 於 19:49:10</span>
			switchToNextTarget();
			this.end(SUCCESS);
			return;
		}
		//postMessage("aaa");		
		var coord = getCoordinate(this.target);
		//</span><span class="coordinatePipe">|</span><span class="coordinateY">
		//if (doc.indexOf("<span class=\"coordinateX\">(" + coord.x + "</span>") < 0 || doc.indexOf("<span class=\"coordinateY\">" + coord.y + ")</span>") < 0) 
		if (doc.indexOf("</span><span class=\"coordinatePipe\">|</span><span class=\"coordinateY\">") < 0) //(-183|-164)
		{
			postMessage("未打開 出兵確認 頁面zz");
			this.end(RETRY);
			return;
		}


		var sAttackDuration = getStrBetween(doc, ">在 ", " 小時", null); //需時 0:13:01 
		postMessage(sAttackDuration);
		this.iAttackDuration = parseTime(sAttackDuration);
		//postMessage(this.iAttackDuration);
		//postMessage(sAttackDuration);

		//var now = new Date();
		//if (now>parseTime()) {//(-183|-164)
		//postMessage(this.target);
		//postMessage("未打開 出兵確認 頁面");
		//this.end(RETRY);
		//return;
		//}		

		var form = getStrBetween(doc, '<form method="post" action="build.php?', '</form>', 10000);
		var param = "";
		var info1 = startFromStr(doc, 'type="hidden" name="timestamp" ', 200);
		var timestamp = getStrBetween(info1, 'value="', '" />', null);
		param += "timestamp=" + timestamp + "&";
		timestamp = startFromStr(info1, timestamp, 200);
		info1 = startFromStr(doc, 'type="hidden" name="timestamp_checksum"', 20);
		param += "timestamp_checksum=" + getStrBetween(info1, 'value="', '" />', null) + "&";
		info1 = startFromStr(doc, 'type="hidden" name="a"', 20);
		param += "a=" + getStrBetween(info1, 'value="', '" />', null) + "&";
		info1 = startFromStr(doc, 'type="hidden" name="kid"', 20);
		param += "kid=" + getStrBetween(info1, 'value="', '" />', null) + "&";
		param += "id=39&c=4&";
		if (form.indexOf('<select name="kata"') >= 0) { //(準備以投石車攻擊)
			param += "kata=" + this.catapult1 + "&";
			param += "kata2=" + this.catapult2 + "&";
		}
		for (var i = 0; i < 21; i++) {
			var input = getStrBetween(form, "<input", ">", 600);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text") {
				param += name + "=" + value + "&";
			}
			if (type == "Radio" && name == "spy") { //偵察
				i--; //this is an additional input of the regular attack form
				if (value == "1") //偵察敵方現有資源和軍隊
					param += name + "=" + value + "&";
			}
			form = startFromStr(form, input, 2000);
		}
		//postMessage("---" + param);

		var info = getStrBetween(doc, "<h1>", "</h1>", 10000); //<h1>對玩家鼎盛東輯事廠的偵察</h1> 的攻擊 的搶奪
		if (info.substr(0, 3) == "對玩家") {
			this.targetVillage = info.substr(3, info.length - 6); //鼎盛東輯事廠
		} else if (info == "偵察綠洲") {
			this.targetVillage = "綠洲";
		}

		if (this.time == null) { // for Attack Action
			postMessage("確認 " + info + " 需時: " + sAttackDuration + " 小時 * 2");
			this.sendRequest("build.php?tt=2&id=39", param, this.action3);
			return;
		} else { // for Precise Attack
			postMessage(info + " 路程需時: " + sAttackDuration + " 小時");
			var iTime = parseTime(this.time.substr(0, 8)) + parseDecimal(this.time.substr(9, 1)) * 0.1; //11:32:01.5
			var iStart = iTime - this.iAttackDuration;
			var nowStr = getTimeStr(new Date());
			var iNow = parseTime(nowStr.substr(0, 8)) + parseDecimal(nowStr.substr(9, 3)) * 0.001; //11:32:01.005
			this.waiting = (iStart - iNow) * 1000;
			if (this.waiting < 0)
				this.waiting += 86400000; //24 hours
			if (this.timeDiff == null || this.waiting > 300000) { // > 5 mins
				postMessage("出兵前還需: " + Math.floor(this.waiting / 1000) + "秒");
				this.end(NOT_READY);
				return;
			}
			// < 5 mins, 準備精確的倒計時
			this.waiting -= this.timeDiff;
			var timer = new Timer(this, this.preciseAttack, [param]);
			timer.setTimer(this.waiting);
			postMessage("倒計時: " + this.waiting / 1000 + "秒");
			return;
		}
	},
	action3: function(doc) {
		if (doc.indexOf("出擊軍團") < 0) {

			postMessage("未打開 出兵成功 頁面");
			this.end(RETRY);
			return;
		}
		this.end(SUCCESS);
		return;
	},
	preciseAttack: function(param) {
		this.sendRequest("build.php?tt=2&id=39", param, this.action3);
		postMessage("壓秒: " + this.time + " " + param);
	}
});
//****** end of Class ******


//Class AttackTimer
function AttackTimer(villageId, target, troops, type, time, catapult1, catapult2) {
	//Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	this.villageId = villageId;
	this.target = target;
	this.troops = troops;
	this.type = type;
	this.time = time;
	this.catapult1 = catapult1;
	this.catapult2 = catapult2;
}
AttackTimer.Extends(BaseWorkflow, {
	//Prototype, put Member Functions here.
	start: function() {
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.run(this, this.attackResult);
	},
	attackResult: function(action) {
		if (action.status == SUCCESS) {
			this.end(SUCCESS);
			return;
		} else if (action.status == NOT_READY) {
			var waiting;
			if (action.waiting) {
				waiting = action.waiting - TimeDiffManager.EVAL_IN_ADVANCE; //提前準備 getTimeDiff()
				if (waiting < 1000)
					waiting = 1000;
				var timer = new Timer(this, this.timeDiffStart, []);
				timer.setTimer(waiting);
				return;
			} else {
				waiting = 600000; //沒有士兵等情況 10 mins 重試
				var timer = new Timer(this, this.start, []);
				timer.setTimer(waiting);
				return;
			}
		} else if (action.status == RETRY) {
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		} else if (action.status == ERROR) {
			this.end(ERROR);
			return;
		}
	},
	timeDiffStart: function() {
		postDebug("target:" + this.target + " time:" + this.time + " - timeDiffStart", this);
		TimeDiffManager.instance.getTimeDiff(this, this.timeDiffResult);
	},
	timeDiffResult: function(timeDiff) {
		postDebug("target:" + this.target + " time:" + this.time + " - timeDiffResult:" + timeDiff, this);
		//準備精確的倒計時
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.timeDiff = timeDiff;
		action.run(this, this.attackResult);
	},
	checkloginResult: function(action) {
		if (action.status == SUCCESS) {
			var timer = new Timer(this, this.start, []);
			timer.setTimer(1000); //1 sec, not neccessary timer
			return;
		} else if (action.status == ERROR) {
			this.end(ERROR);
			return;
		}
	}
});
//****** end of Class ******


//Class ReadReportAction
function ReadReportAction(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
}
ReadReportAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		this.sendRequest("berichte.php", null, this.action1);
	},
	action1: function(doc) {
		if (doc.indexOf("<h1>報告</h1>") < 0) {
			postMessage("未打開報告頁面,請訪問<a href='http://" + g_sServerURL + "/berichte.php' target='blank' >這裏</a>");
			this.end(SUCCESS);
			return; //Cancel Read Report Workflow
		}

		//<a href="berichte.php?id=18182548">齊格飛的鼎盛茶館攻擊無雙城</a>
		var info = getStrBetween(doc, '<a href="berichte.php?id=', '</a>', null);
		if (info.indexOf(g_sTargetVillage) < 0) {
			postMessage("未找到對 " + g_sTargetVillage + " 的報告,請訪問<a href='" + g_sServerURL + "/berichte.php' target='blank' >這裏</a>");
			this.end(SUCCESS);
			return; //Cancel Read Report Workflow
		}
		var id = endWithStr(info, '">'); //18182548

		//偵察
		if (info.indexOf("偵察") >= 0) {
			postMessage('偵察報告 <a target="blank" href="http://' + g_sServerURL + '/berichte.php?id=' + info + '</a>');
			switchToNextTarget();
			this.end(SUCCESS);
			return; //Finished Read Report Workflow
		}

		postMessage('戰鬥報告 <a target="blank" href="http://' + g_sServerURL + '/berichte.php?id=' + info + '</a>');
		this.sendRequest("berichte.php?id=" + id, null, this.action2);
	},
	action2: function(doc) {
		if (doc.indexOf("繳獲物") < 0) {
			postMessage("未取得 繳獲物 報告信息");
			this.end(SUCCESS);
			return; //Cancel Read Report Workflow
		}
		//<td class="s7" colspan="10"><img class="res" src="img/un/r/1.gif">22 <img class="res" src="img/un/r/2.gif">82 <img class="res" src="img/un/r/3.gif">105 <img class="res" src="img/un/r/4.gif">0</td>
		var info = getStrBetween(doc, '<td class="s7" colspan="10">', 'td>', 500);
		var iLoot = 0;
		for (var i = 1; i < 5; i++) {
			var sNumber = getStrBetween(doc, 'img/un/r/' + i + '.gif">', '<', null);
			var iNumber = parseDecimal(sNumber);
			iLoot += iNumber;
		}
		postMessage("繳獲物共計: " + iLoot);

		g_iTotalLoot += iLoot;
		document.getElementById('status').innerHTML = "累計繳獲資源 " + g_iTotalLoot;

		var iLoad = 20; //禁衛兵最低運載量20
		if (iLoad < g_taskCommand.load) //optional, can be null
			iLoad = g_taskCommand.load;
		if (iLoot < iLoad) { //繳獲物 < 運載量
			var messageArray = ["地主家也沒有餘糧了",
				"再去就得開奧迪回來了",
				"下次只能搶回伊利四個圈"
			];
			var index = Math.floor(Math.random() * messageArray.length);
			postMessage(messageArray[index] + "【齊格飛】");
			switchToNextTarget();
		}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class EvaluateTimeDiff
function EvaluateTimeDiff(villageId) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);

	this.TRIAL_TOTAL = 10;
	this.TRIAL_INTERVAL = 100; //milliseconds;
	this.arrayTimeDiff;
	this.arrayRequestTime;
	this.i;
	this.timer = new Timer(this, this.request, null);

	this.timeDiff;
}
EvaluateTimeDiff.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		this.arrayTimeDiff = new Array(this.TRIAL_TOTAL);
		this.arrayRequestTime = new Array(this.TRIAL_TOTAL);

		this.i = 0;
		this.loop();
		return; //Start loop
	},
	loop: function() {
		if (this.i >= this.TRIAL_TOTAL) {
			this.result();
			return; //End of loop
		}

		var waiting = 1000 + this.TRIAL_INTERVAL * this.i;
		var now = new Date();
		waiting -= now.getTime() % 1000;
		if (waiting < 1000)
			waiting += 1000;
		//postMessage( getTimeStr(new Date(now.getTime() + waiting)) );
		this.timer.setTimer(waiting);
	},
	request: function() {
		this.arrayRequestTime[this.i] = new Date();
		this.sendRequest("build.php?tt=2&id=39", null, this.response);
	},
	response: function(doc) {
		if (doc.indexOf("派遣軍隊") < 0) {
			postMessage("未打開 出兵 頁面");
			this.end(RETRY);
			return;
		} //<span id="tp1">3:05:03</span>

		//postMessage("<TEXTAREA  rows=6 cols=60>"+doc+"</TEXTAREA>");
		var info = getStrBetween(doc, '<span  class="timer" counting="up" value="', "</span>", 200); //<div id="ltime">用時 <b>16</b> ms<br>服務器時間: <span id="tp1" class="b">22:38:55</span> <span class="f6">(CST-15)</span></div>
		postMessage(info);
		info = info.substring(info.indexOf('">') + 2, 20);
		postMessage(info);
		var estimateMS = this.arrayRequestTime[this.i].getTime() % 3600000;
		var realMS = parseTime(info) * 1000 % 3600000 + 500; //We suppose that server floors millisecs instead of rounds them
		var diff = realMS - estimateMS;
		if (diff > 1800000)
			diff -= 3600000;
		if (diff < -1800000)
			diff += 3600000;
		postMessage("本地時間 " + getTimeStr(this.arrayRequestTime[this.i]) + " 服務器時間 " + info + " 時差 " + diff + "毫秒");
		if (diff > 60000 || diff < -60000)
			postMessage("時差超過1分鐘，離譜");

		this.arrayTimeDiff[this.i] = diff;

		this.i++;
		this.loop();
		return; //Next loop
	},
	result: function() {
		var array = this.arrayTimeDiff;
		//var sum = 0;
		var earliest = array[0];
		for (var i = 0; i < array.length; i++) {
			//sum += array[i];
			if (array[i] < earliest)
				earliest = array[i];
		}

		//this.timeDiff = Math.round(sum/array.length);
		this.timeDiff = earliest + 450;
		postMessage(array.length + "次嘗試平均時差 " + this.timeDiff + "豪秒");
		//for (var i=0; i<this.arrayRequestTime.length; i++) {
		//	postMessage( getTimeStr(this.arrayRequestTime[i]) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.timeDiff)) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.arrayTimeDiff[i])) );
		//}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class TimeDiffManager
//Singleton
function TimeDiffManager() {
	//Constructor, put Member Variables here.
	this.timeDiff = null;
	this.evaluateTime = null;

	this.evalStartTime = null;

	this.callerStack = new Array(); //[]
	this.villageId = null;
}
TimeDiffManager.Extends(null, {
	//Prototype, put Member Functions here.
	getTimeDiff: function(callerObj, callbackFunction) {
		if (!callbackFunction)
			return;

		if (this.timeDiff && (new Date().getTime() - this.evaluateTime.getTime()) < 300 * 1000) {
			//last evaluation is within  5 min, which means Not Expired
			callbackFunction.apply(callerObj, [this.timeDiff]);
			return;
		}

		//push caller info into Stack
		var caller = new Object();
		caller.callerObj = callerObj;
		caller.callbackFunction = callbackFunction;
		this.callerStack.push(caller);
		//If current caller is the first one, start evaluation process;
		if (this.callerStack[0] == caller) {
			if (callerObj)
				this.villageId = callerObj.villageId;
			this.evaluateStart();
			return;
		}
	},
	evaluateStart: function() {
		this.evalStartTime = new Date();

		var action = new EvaluateTimeDiff(this.villageId);
		action.run(this, this.evaluateResult);
	},
	evaluateResult: function(action) {
		if (action.status == RETRY) {
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		}

		this.timeDiff = action.timeDiff;
		this.evaluateTime = new Date();

		//loop through stack, and callback all callers
		var callbackDueIn = this.evalStartTime.getTime() + TimeDiffManager.EVAL_IN_ADVANCE - this.evaluateTime.getTime() - this.timeDiff;
		var interval;
		if (callbackDueIn > 20 * 1000) { //leave 20 secs for final countdown
			interval = Math.floor((callbackDueIn - 20 * 1000) / this.callerStack.length);
			if (interval < 1000)
				interval = 1000; //1 sec
		} else {
			postError("倒計時時間不足，還剩：" + callbackDueIn / 1000 + "秒");
			interval = 1000; //1 sec
		} //By this interval, callbacks will occur discretely between now and callbackDueIn, so that the final actions will be smooth, without lag

		var array = this.callerStack;
		var caller;
		for (var i = 0; i < array.length; i++) {
			caller = array[i];
			var timer = new Timer(caller.callerObj, caller.callbackFunction, [this.timeDiff]);
			timer.setTimer((i + 1) * interval); //a short delay between reponses to each caller
		}
		array.length = 0;
	},
	checkloginResult: function(action) {
		if (action.status == SUCCESS) {
			var timer = new Timer(this, this.evaluateStart, []);
			timer.setTimer(1000); //1 sec, not neccessary timer
			return;
		} else if (action.status == ERROR) {
			return; //Terminate
		}
	}
});
//Singleton Instance
TimeDiffManager.EVAL_IN_ADVANCE = 90 * 1000; //caller should call getTimeDiff() at least 90 seconds ahead of actual action.
TimeDiffManager.instance = new TimeDiffManager();
//****** end of Class ******


//Class TransportAction
function TransportAction(village1, village2, cargo, freights) {
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(village1.id);

	this.village1 = village1;
	this.village2 = village2;
	this.cargo = cargo;
	this.freights = freights;
}
TransportAction.Extends(BaseHttpAction, {
	//Prototype, put Member Functions here.
	start: function() {
		postMessage("從 " + this.village1.coordStr + " 到 " + this.village2.coordStr + " 運輸" + this.freights + "車: " + this.cargo);
		var param = "id=" + this.village1.marketId; //hidden param
		param += "&r1=" + this.cargo[0];
		param += "&r2=" + this.cargo[1];
		param += "&r3=" + this.cargo[2];
		param += "&r4=" + this.cargo[3];
		var coord = getCoordinate(this.village2.coordStr);
		param += "&dname="; //村莊名字
		param += "&x=" + coord.x; //座標x
		param += "&y=" + coord.y; //座標y
		this.sendRequest("build.php", param, this.action1);
		//postMessage(param);
	},
	action1: function(doc) {
		if (doc.indexOf("在市場你可以和其他玩家交易資源") < 0) {
			postMessage("未打開 市場/運輸 頁面");
			this.end(RETRY);
			return;
		}
		if (doc.indexOf('<p class="b c5">') >= 0) { //<p class="b c5">現有資源太少</p>
			postError("市場報錯: " + getStrBetween(doc, '<p class="b c5">', '</p>', null));
			this.end(ERROR);
			return;
		}

		var form = getStrBetween(doc, '<form method="POST" name="snd" action="build.php">', '<input type="image" value="ok"', 10000);
		var param = "";
		for (var i = 0; i < 8; i++) {
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "Text") {
				param += name + "=" + value + "&";
			}
			form = startFromStr(form, input, 2000);
		}

		var sDuration = getStrBetween(doc, "需時:</td><td>", "</td>", null); //需時:</td><td>0:03:32</td>
		var iDuration = parseTime(sDuration);

		postMessage("確認運輸 需時: " + sDuration + " 小時");
		this.sendRequest("build.php", param, this.action2);
		//postMessage(param);
	},
	action2: function(doc) {
		if (doc.indexOf("資源已被運送") < 0) {
			postMessage("未打開 運輸成功 頁面");
		}
		postMessage("資源已被運送");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******