var CANVAS_WIDTH  = 512;
var CANVAS_HEIGHT = 512;
var CANVAS_ID = 'glcanvas';

var MODEL_PATH = "assets/murakumo/runtime/";
var MODEL_DEFINE = {
    "type":"Live2D Model Setting",
    "name":"murakumo",
    "model": MODEL_PATH + "murakumo.moc",
    "textures":[
        MODEL_PATH + "murakumo.2048/texture_00.png",
    ],
    "motions":[            
        MODEL_PATH + "motions/murakumo_idle_01.mtn",
        MODEL_PATH + "motions/murakumo_idle_02.mtn",
        MODEL_PATH + "motions/murakumo_idle_03.mtn",
        MODEL_PATH + "motions/murakumo_m_01.mtn",
        MODEL_PATH + "motions/murakumo_m_02.mtn",
        MODEL_PATH + "motions/murakumo_tap_bust_01.mtn",
        MODEL_PATH + "motions/murakumo_tap_bust_02.mtn",
        MODEL_PATH + "motions/murakumo_tap_ear_01.mtn",
    ],    
};


// JavaScriptで発生したエラーを取得
window.onerror = function(msg, url, line, col, error) {
    var errmsg = "file:" + url + "<br>line:" + line + " " + msg;
    this.myerror(errmsg);
}

window.onload = function(){
    var glCanvas = new Simple();
}

var Simple = function() {
    // Live2Dモデルのインスタンス
    this.live2DModel = null;   
    // アニメーションを停止するためのID
    this.requestID = null; 
    // モデルのロードが完了したら true
    this.loadLive2DCompleted = false; 
    // モデルの初期化が完了したら true
    this.initLive2DCompleted = false;    
    // WebGL Image型オブジェクトの配列
    this.loadedImages = [];    
    // モーション
    this.motions = [];
    // モーション管理マネジャー
    this.motionMgr = null;
    // モーション番号
    this.motionnm = 0;
    // モーションチェンジ
    this.motionchange = false;
    // Live2D モデル設定。
    this.modelDef = MODEL_DEFINE;    
    // Live2Dの初期化
    Live2D.init();
    // canvasオブジェクトを取得
    this.canvas = document.getElementById(CANVAS_ID);
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.width = CANVAS_WIDTH;

    // コンテキストを失ったとき    
    this.canvas.addEventListener("webglcontextlost", function(e) {
        this.myerror("context lost");
        this.loadLive2DCompleted = false;
        this.initLive2DCompleted = false;

        var cancelAnimationFrame = 
            window.cancelAnimationFrame || 
            window.mozCancelAnimationFrame;
        cancelAnimationFrame(requestID); //アニメーションを停止

        e.preventDefault(); 
    }, false);

    // コンテキストが復元されたとき
    this.canvas.addEventListener("webglcontextrestored" , function(e){
        this.myerror("webglcontext restored");
        this.initLoop(this.canvas); 
    }, false);
    // Init and start Loop
    this.initLoop(this.canvas);
};


/*
* WebGLコンテキストを取得・初期化。
* Live2Dの初期化、描画ループを開始。
*/
Simple.prototype.initLoop = function(canvas/*HTML5 canvasオブジェクト*/) 
{
    //------------ WebGLの初期化 ------------   
    // WebGLのコンテキストを取得する
    var para = {
        premultipliedAlpha : true,
//        alpha : false
    };
    var gl = this.getWebGLContext(canvas, para);
    if (!gl) {
        this.myerror("Failed to create WebGL context.");
        return;
    }

    // 描画エリアを白でクリア
    gl.clearColor( 0.0 , 0.0 , 0.0 , 0.0 );  

    // コールバック対策
    var that = this;

    //------------ Live2Dの初期化 ------------  
    // mocファイルからLive2Dモデルのインスタンスを生成
    this.loadBytes(this.modelDef.model, function(buf){
        that.live2DModel = Live2DModelWebGL.loadModel(buf);
    });

    // テクスチャの読み込み
    var loadCount = 0;
    for(var i = 0; i < that.modelDef.textures.length; i++){
            (function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
                that.loadedImages[tno] = new Image();
                that.loadedImages[tno].src = that.modelDef.textures[tno];
                that.loadedImages[tno].onload = function(){
                    if((++loadCount) == that.modelDef.textures.length) {
                        that.loadLive2DCompleted = true;//全て読み終わった
                    }
                }
                that.loadedImages[tno].onerror = function() { 
                    that.myerror("Failed to load image : " + that.modelDef.textures[tno]); 
                }
            })( i );
    }

        // モーションのロード
        for(var i = 0; i < that.modelDef.motions.length; i++){
            that.loadBytes(that.modelDef.motions[i], function(buf){
                that.motions.push(Live2DMotion.loadMotion(buf));
            });
        }
        // モーションマネジャーのインスタンス化
       that.motionMgr = new L2DMotionManager();

        // マウスクリックイベント
        that.canvas.addEventListener("click", function(e){
            that.motionchange = true;
            if(that.motions.length - 1  > that.motionnm){
                that.motionnm++;
            }else{
                that.motionnm = 0;                
            }
        }, false);
    //------------ 描画ループ ------------

    (function tick() {
        that.draw(gl, that); // 1回分描画

        var requestAnimationFrame = 
            window.requestAnimationFrame || 
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame || 
            window.msRequestAnimationFrame;
        requestID = requestAnimationFrame( tick , that.canvas );// 一定時間後に自身を呼び出す
    })();
};


Simple.prototype.draw = function(gl/*WebGLコンテキスト*/, that)
{
    // Canvasをクリアする
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Live2D初期化
    if( ! that.live2DModel || ! that.loadLive2DCompleted ) 
    return; //ロードが完了していないので何もしないで返る

    // ロード完了後に初回のみ初期化する
    if( ! that.initLive2DCompleted ){
            that.initLive2DCompleted = true;

        // 画像からWebGLテクスチャを生成し、モデルに登録
        for( var i = 0; i < that.loadedImages.length; i++ ){
            //Image型オブジェクトからテクスチャを生成
            var texName = that.createTexture(gl, that.loadedImages[i]);
            that.live2DModel.setTexture(i, texName); //モデルにテクスチャをセット
        }

        // テクスチャの元画像の参照をクリア
        that.loadedImages = null;
        // OpenGLのコンテキストをセット
        that.live2DModel.setGL(gl);

        // 表示位置を指定するための行列を定義する
        var s = 2.0 / that.live2DModel.getCanvasWidth(); //canvasの横幅を-1..1区間に収める
        var matrix4x4 = [
             s, 0, 0, 0,
             0,-s, 0, 0,
             0, 0, 1, 0,
            -1, 1, 0, 1
        ];
        that.live2DModel.setMatrix(matrix4x4);
    }

    // モーションが終了していたら再生する
    if(that.motionMgr.isFinished() || that.motionchange == true ){
        that.motionMgr.startMotion(that.motions[that.motionnm], 0);        
        that.motionchange = false;
        console.info("motion:" + that.motionnm);
    }
    // モーション指定されていない場合は何も再生しない
    if(that.motionnm != null){
        // モーションパラメータの更新
        that.motionMgr.updateParam(that.live2DModel);
    }

//    // キャラクターのパラメータを適当に更新
//    var t = UtSystem.getTimeMSec() * 0.001 * 2 * Math.PI; //1秒ごとに2π(1周期)増える
//    var cycle = 3.0; //パラメータが一周する時間(秒)
//    // PARAM_ANGLE_Xのパラメータが[cycle]秒ごとに-30から30まで変化する
//    that.live2DModel.setParamFloat("PARAM_ANGLE_X", 30 * Math.sin(t/cycle));

    // Live2Dモデルを更新して描画
    that.live2DModel.update(); // 現在のパラメータに合わせて頂点等を計算
    that.live2DModel.draw();    // 描画
};


/*
* WebGLのコンテキストを取得する
*/
Simple.prototype.getWebGLContext = function(canvas/*HTML5 canvasオブジェクト*/)
{
    var NAMES = [ "webgl" , "experimental-webgl" , "webkit-3d" , "moz-webgl"];

    var param = {
        alpha : true,
        premultipliedAlpha : true
    };

    for( var i = 0; i < NAMES.length; i++ ){
        try{
            var ctx = canvas.getContext( NAMES[i], param );
            if( ctx ) return ctx;
        } 
        catch(e){}
    }
    return null;
};


/*
* Image型オブジェクトからテクスチャを生成
*/
Simple.prototype.createTexture = function(gl/*WebGLコンテキスト*/, image/*WebGL Image*/) 
{
    var texture = gl.createTexture(); //テクスチャオブジェクトを作成する
    if ( !texture ){
        mylog("Failed to generate gl texture name.");
        return -1;
    }

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  //imageを上下反転
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D , texture );
    gl.texImage2D( gl.TEXTURE_2D , 0 , gl.RGBA , gl.RGBA , gl.UNSIGNED_BYTE , image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture( gl.TEXTURE_2D , null );

    return texture;
};


/*
* ファイルをバイト配列としてロードする
*/
Simple.prototype.loadBytes = function(path , callback)
{
    var request = new XMLHttpRequest();
    request.open("GET", path , true);
    request.responseType = "arraybuffer";
    request.onload = function(){
        switch( request.status ){
        case 200:
                callback( request.response );
                break;
        default:
                Simple.myerror( "Failed to load (" + request.status + ") : " + path );
                break;
        }
    }    
    request.send(null); 
};

/*
* 画面ログを出力
*/
Simple.prototype.mylog = function(msg/*string*/)
{
    var myconsole = document.getElementById("myconsole");
    myconsole.innerHTML = myconsole.innerHTML + "<br>" + msg;
    console.log(msg);
};

/*
* 画面エラーを出力
*/
Simple.prototype.myerror = function(msg/*string*/)
{
    console.error(msg);
    that.mylog( "<span style='color:red'>" + msg + "</span>");
};