var thisRef = this;
var a = document.createElement("canvas");
$(a).css({
	position: 'fixed',
	top: 0,
	left: 0,
	'pointer-events': 'none'
});
a.width = window.innerWidth;
a.height = window.innerHeight;
/*emptydiv.setAttribute("position", "absolute");
emptydiv.setAttribute("top", 0); */
//emptydiv.style.left = x_pos;
//emptydiv.style.top = y;
var rratio = window.innerWidth / window.innerHeight;
var winW = -1;
var winH = -1;

document.body.appendChild(a);
a.setAttribute("id", "glcanvas");

a.setAttribute("z-index", 999999);

var b = document.createElement("btnChange");
b.setAttribute("class","active");
b.setAttribute("id", "btnChange");

document.body.appendChild(b);

var c = document.createElement("myconsole");

$(function() { murakumo(); })

window.onerror = function(msg, url, line, col, error) {
	var errmsg = "file:" + url + "<br>line:" + line + " " + msg;
	l2dError(errmsg);
}

var murakumo = function() {
	this.platform = window.navigator.platform.toLowerCase();

	this.live2DMgr = new LAppLive2DManager();

	this.isDrawStart = false;

	this.gl = null;
	this.canvas = null;

	this.dragMgr = null; /*new L2DTargetPoint();*/
	this.viewMatrix = null; /*new L2DViewMatrix();*/
	this.projMatrix = null; /*new L2DMatrix44()*/
	this.deviceToScreen = null; /*new L2DMatrix44();*/

	this.drag = false;
	this.oldLen = 0;

	this.lastMouseX = 0;
	this.lastMouseY = 0;

	this.isModelShown = false;


	initL2dCanvas("glcanvas");

	init();
}

function initL2dCanvas(canvasId) {
	this.canvas = a;
	if (this.canvas) {
		if (document.addEventListener) {
			document.addEventListener("mousemove", mouseEvent, false);
			document.addEventListener("mousedown", mouseEvent, false);
			window.addEventListener("resize", resizeEvent, false);
			window.addEventListener("orientation change", resizeEvent, false);
		}

		btnChangeModel = b;
	}
}

function init() {
	var width = this.canvas.width;
	var height = this.canvas.height;

	this.dragMgr = new L2DTargetPoint();

	winW = window.innerWidth;
	winH = window.innerHeight;

	var ratio = height / width;
	var left = LAppDefine.VIEW_LOGICAL_LEFT;
	var right = LAppDefine.VIEW_LOGICAL_RIGHT;
	var bottom = -ratio;
	var top = ratio;

	this.viewMatrix = new L2DViewMatrix();


	this.viewMatrix.setScreenRect(left, right, bottom, top);


	this.viewMatrix.setMaxScreenRect(LAppDefine.VIEW_LOGICAL_MAX_LEFT,
									 LAppDefine.VIEW_LOGICAL_MAX_RIGHT,
									 LAppDefine.VIEW_LOGICAL_MAX_BOTTOM,
									 LAppDefine.VIEW_LOGICAL_MAX_TOP);

	this.viewMatrix.setMaxScale(LAppDefine.VIEW_MAX_SCALE);
	this.viewMatrix.setMinScale(LAppDefine.VIEW_MIN_SCALE);

	this.projMatrix = new L2DMatrix44();
	this.projMatrix.multTranslate(0.002*window.innerWidth, -1*0.00055*window.innerHeight);
	this.projMatrix.multScale(1 / 4, (width / height / 4));


	this.deviceToScreen = new L2DMatrix44();
	this.deviceToScreen.multTranslate(-width / 1.2, -height / 1.4);
	this.deviceToScreen.multScale(2 / width, -2 / width);



	this.gl = getWebGLContext();
	if (!this.gl) {
		l2dError("Failed to create WebGL context.");
		return;
	}


	this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

	changeModel();

	startDraw();
}

function startDraw() {
	if(!this.isDrawStart) {
		this.isDrawStart = true;
		(function tick() {
				draw();
				var requestAnimationFrame =
					window.requestAnimationFrame ||
					window.mozRequestAnimationFrame ||
					window.webkitRequestAnimationFrame ||
					window.msRequestAnimationFrame;


				requestAnimationFrame(tick ,this.canvas);
		})();
	}
}

function draw()
{
	// l2dLog("--> draw()");
	MatrixStack.reset();
	MatrixStack.loadIdentity();

	this.dragMgr.update();
	this.live2DMgr.setDrag(this.dragMgr.getX(), this.dragMgr.getY());


	this.gl.clear(this.gl.COLOR_BUFFER_BIT);

	MatrixStack.multMatrix(projMatrix.getArray());
	MatrixStack.multMatrix(viewMatrix.getArray());
	MatrixStack.push();

	for (var i = 0; i < this.live2DMgr.numModels(); i++)
	{
		var model = this.live2DMgr.getModel(i);

		if(model == null) return;

		if (model.initialized && !model.updating)
		{
			model.update();
			model.draw(this.gl);

			if (!this.isModelShown && i == this.live2DMgr.numModels()-1) {
				this.isModelShown = !this.isModelShown;

			}
		}
	}

	MatrixStack.pop();
}

function changeModel()
{

	this.isModelShown = false;

	this.live2DMgr.reloadFlg = true;
	this.live2DMgr.count++;

	this.live2DMgr.changeModel(this.gl);
}

function modelScaling(scale)
{
	var isMaxScale = thisRef.viewMatrix.isMaxScale();
	var isMinScale = thisRef.viewMatrix.isMinScale();

	thisRef.viewMatrix.adjustScale(0, 0, scale);


	if (!isMaxScale)
	{
		if (thisRef.viewMatrix.isMaxScale())
		{
			thisRef.live2DMgr.maxScaleEvent();
		}
	}

	if (!isMinScale)
	{
		if (thisRef.viewMatrix.isMinScale())
		{
			thisRef.live2DMgr.minScaleEvent();
		}
	}
}

function modelTurnHead(event)
{
	thisRef.drag = true;
	if(event.clientX == 0 && event.clientY == 0)
	   return;

	var rect = this.canvas.getBoundingClientRect();

	var sx = transformScreenX(event.clientX - rect.left);
	var sy = transformScreenY(event.clientY - rect.top);
	var vx = transformViewX(event.clientX - rect.left);
	var vy = transformViewY(event.clientY - rect.top);

	if (LAppDefine.DEBUG_MOUSE_LOG)
		l2dLog("onMouseDown device( x:" + event.clientX + " y:" + event.clientY + " ) view( x:" + vx + " y:" + vy + ")");

	thisRef.lastMouseX = sx;
	thisRef.lastMouseY = sy;

	thisRef.dragMgr.setPoint(vx, vy);
	//thisRef.live2DMgr.tapEvent(vx, vy);
}

function followPointer(event)
{
	var rect = this.canvas.getBoundingClientRect();

	var sx = transformScreenX(event.clientX - rect.left);
	var sy = transformScreenY(event.clientY - rect.top);
	var vx = transformViewX(event.clientX - rect.left);
	var vy = transformViewY(event.clientY - rect.top);

	if (LAppDefine.DEBUG_MOUSE_LOG)
		l2dLog("onMouseMove device( x:" + event.clientX + " y:" + event.clientY + " ) view( x:" + vx + " y:" + vy + ")");

	if (thisRef.drag)
	{
		thisRef.lastMouseX = sx;
		thisRef.lastMouseY = sy;

		thisRef.dragMgr.setPoint(vx, vy);
	}
}

function lookFront()
{
	if (thisRef.drag)
	{
		thisRef.drag = false;
	}

	thisRef.dragMgr.setPoint(0, 0);
}

function resizeEvent(e){
	e.preventDefault();
	var ratio = this.canvas.width / this.canvas.height;
	var newHeight = window.innerHeight - winH;
	var newWidth = window.innerWidth - winW;
	winW = window.innerWidth;
	winH = window.innerHeight;
	this.canvas.width += newWidth;
	this.canvas.height += newHeight;

	//this.projMatrix = new L2DMatrix44();
	//this.projMatrix.multTranslate(0.0, 0.0);
	//this.projMatrix.multScale(1 / 4, (rratio/4));
	/**
	if (newWidthToHeight > rratio) {
		//newWidth = newHeight * rratio;
		//newWidth = newHeight * rratio;

	} else {
		//newHeight = newWidth / rratio;
		gl.viewport(0, 0, drawingbufferwidth, drawingbufferwidth / rratio);
	}	**/
	//this.canvas.width = window.innerWidth;
	//this.canvas.height = window.innerHeight;
	//gl.viewport(0,0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	//this.projMatrix = new L2DMatrix44();
	//this.projMatrix.multTranslate(0.0, 0.0);
	//this.projMatrix.multScale(1 / 4, (rratio/4));

	//gl.viewport(0, 0, drawingbufferwidth, drawingbufferheight);




	draw();

}

function mouseEvent(e)
{
	if (e.type == "mousedown") {

		var rect = document.getElementById("glcanvas").getBoundingClientRect();

	var sx = transformScreenX(event.clientX - rect.left);
	var sy = transformScreenY(event.clientY - rect.top);
	var vx = transformViewX(event.clientX - rect.left);
	var vy = transformViewY(event.clientY - rect.top);

		console.log(vx + " " + vy);
		thisRef.live2DMgr.tapEvent(vx, vy);

	}
	else if(e.type == "mousemove"){
		modelTurnHead(e);

	} /*else if (e.type == "mousemove") {

		followPointer(e);

	} else if (e.type == "mouseup") {


		if("button" in e && e.button != 0) return;

		lookFront();

	} else if (e.type == "mouseout") {

		lookFront();

	} else if (e.type == "contextmenu") {

		changeModel();
	}
	*/
}

function touchEvent(e)
{
	e.preventDefault();

	var touch = e.touches[0];

	if (e.type == "touchstart") {
		if (e.touches.length == 1) modelTurnHead(touch);
			onClick(touch);

	} else if (e.type == "touchmove") {
		followPointer(touch);

		if (e.touches.length == 2) {
			var touch1 = e.touches[0];
			var touch2 = e.touches[1];

			var len = Math.pow(touch1.pageX - touch2.pageX, 2) + Math.pow(touch1.pageY - touch2.pageY, 2);
			if (thisRef.oldLen - len < 0) modelScaling(1.025);
			else modelScaling(0.975);

			thisRef.oldLen = len;
		}

	} else if (e.type == "touchend") {
		lookFront();
	}
}

function transformViewX(deviceX)
{
	var screenX = this.deviceToScreen.transformX(deviceX);
	return viewMatrix.invertTransformX(screenX);
}

function transformViewY(deviceY)
{
	var screenY = this.deviceToScreen.transformY(deviceY);
	return viewMatrix.invertTransformY(screenY);
}

function transformScreenX(deviceX)
{
	return this.deviceToScreen.transformX(deviceX);
}

function transformScreenY(deviceY)
{
	return this.deviceToScreen.transformY(deviceY);
}

function getWebGLContext()
{
	var NAMES = [ "webgl" , "experimental-webgl" , "webkit-3d" , "moz-webgl", "2d"];

	for( var i = 0; i < NAMES.length; i++ ){
		try{
			var ctx = this.canvas.getContext(NAMES[i], {premultipliedAlpha : true});
			if(ctx) return ctx;
		}
		catch(e){
			console.log(e);
		}
	}
	return null;
};

function l2dLog(msg) {
	if(!LAppDefine.DEBUG_LOG) return;

	var myconsole = c;
	myconsole.innerHTML = myconsole.innerHTML + "<br>" + msg;

	console.log(msg);
}



function l2dError(msg)
{
	if(!LAppDefine.DEBUG_LOG) return;

	l2dLog( "<span style='color:red'>" + msg + "</span>");

	console.error(msg);
};
