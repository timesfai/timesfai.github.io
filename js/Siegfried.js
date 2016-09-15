// JScript File


// Utility Functions
function parseDecimal(str) {
	var result = parseInt(str, 10);

	if (isNaN(result)) {
		postError("無法解析的數字:" + str);
		return 0;
	} else {
		return result;
	}
}

function parseTime(str) {
	//str is like "0:29:45"
	var iHour = parseDecimal(endWithStr(str, ":"));
	str = startFromStr(str, ":", 50);
	var iMin = parseDecimal(endWithStr(str, ":"));
	str = startFromStr(str, ":", 50);
	var iSec = parseDecimal(str);
	var result = ((iHour * 60) + iMin) * 60 + iSec;

	if (isNaN(result)) {
		postError("無法解析的時間:" + str);
		return 0;
	} else {
		return result;
	}
}

function getTimeStr(date) {
	var timePos = date.toString().indexOf(":") - 2;
	var str = date.toString().substr(timePos, 8);
	var milliSec = date.getTime() % 1000;
	if (milliSec > 0) {
		var milliStr = "00" + milliSec;
		milliStr = milliStr.substr(milliStr.length - 3, 3);
		str += "." + milliStr;
	}

	return str;
}

function getNowTimestamp() {
	var now = new Date();
	var hour = "0" + now.getHours();
	hour = hour.substr(hour.length - 2, 2);
	var min = "0" + now.getMinutes();
	min = min.substr(min.length - 2, 2);
	var sec = "0" + now.getSeconds();
	sec = sec.substr(sec.length - 2, 2);
	return now.getFullYear() + "-" + now.getMonth() + "-" + now.getDay() + " " + hour + ":" + min + ":" + sec;
	//return new Date().toLocaleString();
}

function getCoordinate(string) {
	var coord = new Object();
	var iPos = string.indexOf("|");
	if (iPos > 0) {
		coord.x = string.substr(0, iPos);
		coord.y = string.substr(iPos + 1, string.length - (iPos + 1));
	}
	if (isNaN(coord.x) || isNaN(coord.y))
		postError("無法解析的座標:" + string);
	return coord;
}

function getHtmlParam(sParamName) {
	var sParams = startFromStr(location.href, "?", 2000) + "&";
	return getStrBetween(sParams, sParamName + "=", "&", 1000);
}

function startFromStr(string, sStart, iCount) {
	var iPos = string.indexOf(sStart);
	if (iPos < 0)
		return "";
	return string.substr(iPos + sStart.length, iCount);
}

function endWithStr(string, sEnd) {
	var iPos = string.indexOf(sEnd);
	if (iPos < 0)
		return "";
	return string.substr(0, iPos);
}

function getStrBetween(string, start, end, maxLength) {
	if (maxLength == null)
		maxLength = 100; //default result string max length
	var result = startFromStr(string, start, maxLength + end.length);
	result = endWithStr(result, end);
	//alert(String + "=" + start + "=" + end + "=" + result);
	return result;
}

function getClassName(obj) {
	var className = "";
	if (obj && obj.constructor)
		className = getStrBetween(obj.constructor.toString(), "function ", "(", null); //等效於 getFunctionName(obj.constructor)
	return className;
}

function getFunctionName(func) {
	var funcName = "";
	if (func && func instanceof Function)
		funcName = getStrBetween(func.toString(), "function ", "(", null);
	return funcName;
}

function getResourceImg(type) {
	return "<img border=0 src='http://" + g_sServerURL + "/img/un/r/" + (type + 1) + ".gif' />";
}

var g_sMessage = "";

function postMessage(msg) {
	g_sMessage += getNowTimestamp() + ": " + msg + "<br/>\r\n";
	if (g_sMessage.length > 5000)
		g_sMessage = startFromStr(g_sMessage, "\r\n", 6000);
	document.getElementById('message').innerHTML = g_sMessage;
}

function clearMessage() {
	g_sMessage = "";
	document.getElementById('message').innerHTML = g_sMessage;
}

function postDebug(msg, callerObj) {
	if (!g_isDebug)
		return;

	var className = getClassName(callerObj);
	postMessage("[Debug]{" + className + "}" + msg);
}

function postError(msg) {
	postMessage("[Error] " + msg);
	//stopBot();
}


//////////////////////////////////////////////////////////////////
//
// Class Extension Implemention
//
// @author Rick Sun
//
// Usage:
//	function ClassB() {
//		this.Super = ClassA;
//		this.Super(); //Call Super Constructor first
//		//Constructor, put Member Variables here.
//	}
//	Class.Extends(ClassB, ClassA, {
//		//Prototype, put Member Functions here.
//		member1:function(){……},
//		member1:function(){……}
//	});
//
//////////////////////////////////////////////////////////////////
var Class = {
	Extends: function(subClass, superClass, protoType) {
		if (superClass) {
			Class.ExtendProto(subClass.prototype, superClass.prototype);
		}
		Class.ExtendProto(subClass.prototype, protoType);
	},
	ExtendProto: function(destination, source) {
		for (property in source) {
			destination[property] = source[property];
		}
	}
}
Function.prototype.Extends = function(superClass, protoType) {
		Class.Extends(this, superClass, protoType);
	}
	///////////////////////////// END of Class Extension /////////////////////////////


// Timer Class
function Timer(obj, func, args) {
	if (args == null)
		args = [];

	function execute() {
		func.apply(obj, args);
	}

	var timeout;
	this.setTimer = function(millisec) {
		clearTimeout(timeout);
		timeout = setTimeout(execute, millisec);
		//postDebug("setTimeout "+ getClassName(obj) +"."+ getFunctionName(func) +" in "+ millisec +"ms", this);
	}
	this.clearTimer = function() {
		clearTimeout(timeout);
		//postDebug("clearTimeout "+ getClassName(obj) +"."+ getFunctionName(func) +" in "+ millisec +"ms", this);
	}
}

function getOs() {
	var OsObject = "";
	if (navigator.userAgent.indexOf("MSIE") > 0) {
		return "MSIE"; //IE瀏覽器
	}
	if (isFirefox = navigator.userAgent.indexOf("Firefox") > 0) {
		return "Firefox"; //Firefox瀏覽器
	}
	if (isSafari = navigator.userAgent.indexOf("Safari") > 0) {
		return "Safari"; //Safan瀏覽器
	}
	if (isCamino = navigator.userAgent.indexOf("Camino") > 0) {
		return "Camino"; //Camino瀏覽器
	}
	if (isMozilla = navigator.userAgent.indexOf("Gecko/") > 0) {
		return "Gecko"; //Gecko瀏覽器
	}
}

// PUBLIC class AjaxRequestText
function AjaxRequestText() {
	// PRIVATE:
	var callerObj = null;
	var callbackFunc = null;
	var request = null;


	// PRIVATE: Get XML HTTP Request object
	function getRequest() {
		var req = null;

		if (window.ActiveXObject) {
			try {
				req = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e1) {
				try {
					req = new ActiveXObject("Msxml2.XMLHTTP");
				} catch (e2) {
					req = null;
				}
			}
		} else if (window.XMLHttpRequest) {
			//ブラウザーはFireFoxなどの場合、以下のようにたつ
			try {
				req = new XMLHttpRequest();
			} catch (e3) {
				alert("not support AJAX");
			}
		}

		/*		// Mozilla and Internet Explorer 7
				if (window.XMLHttpRequest) {
					req = new XMLHttpRequest();
				}
				// Microsoft IE before 7
				if (window.ActiveXObject) {
					try { req = new ActiveXObject("Msxml2.XMLHTTP"); }
					catch(e) {
						try { req = new ActiveXObject("Microsoft.XMLHTTP"); }
						catch(e) { req = null; }
					}
				}  */
		return req;
	}

	// PRIVATE:
	function callbackHandler() {
		/************
	    if (request.readyState == 4) { // 完成
            if (request.status == 200) { // 響應正常
                //將響應的文本分割成Span元素
                //alert(id+"\n"+req.responseText);
                //document.getElementById(id).innerHTML = request.responseText;
                var text = request.responseText;
            } else {
                alert("Problem with server response:\n "+ request.statusText);
            }
        }
		*************/
		//**************
		if (request && request.readyState == 4 && callbackFunc) {
			var text = request.responseText;
			callbackFunc.apply(callerObj, [text]);
		}
		/****************/

	}

	// PUBLIC:
	this.send = function(url, params, callerObject, callbackFunction) {
		callerObj = callerObject;
		callbackFunc = callbackFunction;
		// Have to create new request for IE. 
		// Mozilla could reuse the same request. 
		request = getRequest();
		if (request) {
			if (window.netscape) { //Enable cross-domain request from local
				try {
					netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
				} catch (e) {
					alert("Permission UniversalBrowserRead denied.");
				}
			}
			request.onreadystatechange = callbackHandler;
			request.open("POST", url, true);
			request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"); //text/html; charset=UTF-8
			request.send(params);
		}
	}

	var requestSync = null;
	// PUBLIC:
	this.sendSync = function(url, params) {
		var result;
		if (!requestSync)
			requestSync = getRequest();
		if (requestSync) {
			if (window.netscape) { //Enable cross-domain request from local
				try {
					netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
				} catch (e) {
					alert("Permission UniversalBrowserRead denied.");
				}
			}
			requestSync.open("POST", url, false);
			/*************IE************/
			requestSync.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			requestSync.send(params);
			if (requestSync && requestSync.readyState == 4) {
				result = requestSync.responseText;
			}
			/************IE END*********/

			/**********FireFox****/
			//requestSync.onreadystatechange=function() 
			//{
			//    if (requestSync.readyState==200)
			//   {
			//	    result = requestSync.responseText;
			//    }
			//}
			//requestSync.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			//requestSync.send(params);
			//result = requestSync.responseText;
			/************FireFox END********/

			return result;
		}
	}
}
///////////////////////////// END AjaxRequestText Object /////////////////////////////