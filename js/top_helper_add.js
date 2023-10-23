//-------------------------------------------------------------------------------------------------
//查找玩家坐标
helper.pro.findPlayer={
    option: {
        whole: !1,
        tag: !1,
        real: !1
    },
    a_tag: null,
    player: null,
    point: null,
    fields: [],
    blocks: [],

    goto(e) {
        var f = __require("WorldMapTools")
          , k = __require("NWorldMapData").default.instance.serverData.currentServerId, k = k > 0 ? k : UserData.ServerId 
          , r = __require("NWorldMapData").default.instance.serverData.currentSubMap

        e = e.innerText.split(',')      
        e.length == 2 && (f.default.goToWorldMapByPos({x: e[0], y: e[1], s: k, subMap: r}), this.close())
    },
    
    async exec() {
        this.searching ? this.stopping = !0 : await this._find()
        this._render()
    },

    async more() {
        this.fields = [], this.searching2 = !0, this._render()
        await this._searchFields(this.point.pid)
        this._render()
    },

    async _find() {
        var doc = helper.dialog.iframe.contentWindow.document
        this.option.whole = doc.getElementById('whole').checked
        this.option.tag = doc.getElementById('tag').checked
        this.player = doc.getElementById('player').value
        this.a_tag = doc.getElementById('a_tag').value
        if (this.player) {
            this.point = null,
            this.fields = [],
            this.searching = !0,
            this.stopping = !1,
            this._render(),
            await this._searchCity()
        }
    },

    async _searchCity() {

        this.option.real = helper.dialog.iframe.contentWindow.document.getElementById('real').checked
        for (var i = 0; !this.stopping && !this.point && i < this.map.block_num; ++i) {  // 地图划分为block_num块,每块坐标范围86*156,部分重叠(每次请求服务器返回90*160)  普通地图坐标范围:[x:0-816, y:0-952]
            var o = await this._getBlock(i) 
            o && o.pointList && o.pointList.forEach(p=>{
                var username = p.p && (!this.option.tag || this.a_tag == p.p.a_tag) && p.p.playerInfo && JSON.parse(p.p.playerInfo).username;
                (username && (this.option.whole ? username==this.player : username.includes(this.player)) || p.p && p.p.pid == this.player) && (
                    this.point = {x:p.x, y:p.y, k:p.k, username:username, pid:p.p.pid, data:p}
                )
            })
        }
        this.searching = !1, this.stopping = !1;  
    },

    async _searchFields(pid) 
    {
        this.option.real = helper.dialog.iframe.contentWindow.document.getElementById('real').checked
        for(var i = 0; i < this.map.block_num; ++i) {
            var o = await this._getBlock(i)
            o && o.pointList && o.pointList.forEach(p=>(p.r && p.r.ownerId == pid || p.b && p.b.pid == pid) &&       // r:{pointType=4:普通田，=38:联盟田} b:{pointType=24:机械田} p:{pointType=1:基地}
                !this.fields.find(e=>e.x==p.x && e.y==p.y) && this.fields.push({x:p.x, y:p.y, k:p.k, type:p.pointType, data:p})
            )
        }
        this.searching2 = !1
    },

    //查找一个盟的所有玩家ID名字及坐标
    async findRebels(tag) 
    {
        this.option.real  = !1
        for(var rebels = [], i=0; i<this.map.block_num; ++i) {
            var o = await this._getBlock(i)
            o && o.pointList && o.pointList.forEach(e=>e && e.p && tag == e.p.a_tag && !rebels.find(t=>t.pid==e.p.pid) && rebels.push({username: JSON.parse(e.p.playerInfo).username, pid:e.p.pid, x:e.x, y:e.y, k:e.k}));
        }
        rebels.forEach(e=>console.log("k:", e.k, "  x:", e.x.toString().padEnd(3), "  y:", e.y.toString().padEnd(3), "  pid:", e.pid, "  name:", e.username))
    },

    async _getBlock(i) {
        (this.option.real || !this.blocks[i] || ServerTime - this.blocks[i].time > 300) && (this.blocks[i] = {data: await this._getServer(i), time: ServerTime})
        return this.blocks[i].data
    },

    async _getServer(i) {
        var c = i % this.map.cols, r = Math.floor(i / this.map.cols)
        var x = Math.min(Math.floor((c+0.5)*this.map.bw)+1, this.map.width-16)   //even
        var y = Math.min(Math.floor((r+0.5)*this.map.bh), this.map.height-16)
        var k = __require("NWorldMapData").default.instance.serverData.currentServerId, k = k > 0 ? k : UserData.ServerId  
        return send(RequestId.GET_WORLD_INFO, {x: x, y: y, k: k, rid: 0, marchInfo: !1, viewLevel: 1})
    },
    
    _render() {
        function timestr(t) {var a=new Date(t*1000); return (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}

        var iframe = helper.dialog.iframe
        if (iframe && iframe.name == "find-player") {
            var doc = iframe.contentWindow.document
            var e, html
            
            e = doc.getElementById("player")
            e.value = this.player ? this.player : ""
            e.readOnly = this.searching

            e =doc.getElementsByTagName("button")[0]
            e.innerText = this.searching ? "停止查找" : "查找"

            e = doc.getElementById("whole")
            e.checked = this.option.whole
            e.disabled = this.searching

            e = doc.getElementById("tag")
            e.checked = this.option.tag
            e.disabled = this.searching

            e = doc.getElementById("a_tag")
            e.type = this.option.tag ? "text" : "hidden"
            e.value = this.a_tag
            e.readOnly = this.searching

            e = doc.getElementById("real")
//            e.checked = this.option.real
            e.disabled = this.searching || this.searching2
            
            e = doc.getElementById("point").getElementsByTagName("label")[0]
            e.innerText = this.point ? "玩家"+this.point.username+"(ID:"+this.point.pid+")坐标:" : 
                          this.stopping ? "停止查找玩家"+this.player+"..." : 
                          this.searching ? "正在查找玩家"+this.player+"..." : 
                          this.player ? "未查找到玩家"+this.player+"的位置" : "新的查找"

            e = doc.getElementById("point").getElementsByTagName("a")[0]
            e.innerText = this.point ? this.point.x + "," + this.point.y : ""
            e.style.visibility = this.point ? "visible" : "hidden"

            e = doc.getElementById("point").getElementsByTagName("a")[1]
            e.style.visibility = this.point ? "visible" : "hidden"

            e = doc.getElementById('shield')
            e.innerText = this.point && this.point.data.p.shieldTime && this.point.data.p.shieldTime > ServerTime ? "开盾时间:"+timestr(this.point.data.p.shieldTime) : ""
            e.style.visibility = this.point && this.point.data.p.shieldTime && this.point.data.p.shieldTime > ServerTime ? "visible" : "hidden"
  
            html = this.searching2 ? "<label>正在查找...<\/label>" : "<label>其他坐标:<\/label>"
            this.fields.forEach(e=>html += '<a href="javascript:void(0)" onclick="parent.helper.pro.findPlayer.goto(this)">' + e.x + ',' + e.y + '<\/a>　')
            e = doc.getElementById("field")
            e.innerHTML = html
        }
    },

    init() {
        var g = __require("NWorldMapCommon").allMapInfos[__require("NWorldMapCoreBiz").default.mapType]
        var w = g.subMap ? g.subMap.get(0).width * 2 : g.cols * 2, h = g.subMap ? g.subMap.get(0).height : g.rows, c = Math.ceil(w / 86), r = Math.ceil(h / 156)
        this.map={width:w, height:h, bw:86, bh:156, cols:c, rows:r, block_num:c*r}
    },

    open() {
        helper.dialog.open({name:"find-player", width:550, height:160, html:this.html, onclose:this.onclose.bind(this)});
        this._render(); 
    },

    close() {
        helper.dialog.close();
    },

    onclose() {
        (this.stopping || !this.searching) && (this.searching=!1, this.stopping = !1);
    }
}

helper.pro.findPlayer.html = String.raw
`<html charset="UTF-8">
<head>
    <style>
        body{line-height:22px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
        h3{display:block; margin-top:12px; margin-bottom:4px; text-align:center; width:100%;}
        label{display:inline-block;margin-left:4px; margin-right:4px; margin-top:4px;}
        input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-top:8px; margin-bottom:4px; padding:2px;height:20px;}
        input::-webkit-input-placeholder{color: #aaa;}
        input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
        #player{margin-left:4px; width:420px;} #a_tag{margin-top:0px; width:60px}
        #option{height:26px;}
        #result{height:56px; overflow:auto;}
        button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-left:8px; width:90px; height:21px;}
        button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    <\/style>
    <script>
        function $(a) {return a && '#'==a[0] && document.getElementById(a.substring(1))}
    <\/script>
<\/head>
<body>
    <h3>查找玩家坐标<\/h3>
    <div>
        <input type="text" id="player" placeholder="请输入玩家名字或ID">
        <button onclick="parent.helper.pro.findPlayer.exec()">查找<\/button><br>
    <\/div>
    <div id="option">
        <input type="checkbox" id="whole"><label>全称<\/label>
        <input type="checkbox" id="tag" onclick="$('#a_tag').type=this.checked?'text':'hidden';"><label>联盟<\/label>
        <input type="hidden" id="a_tag" placeholder="联盟代码">
        <input type="checkbox" id="real" onclick="$('#tips').style.visibility=this.checked ? 'visible':'hidden'"><label>实时<\/label><label id="tips" style="color:red; visibility:hidden">频繁使用会被暂停登录，谨慎使用。<\/label>
    <\/div>
    <div id="result">
        <div id="point"><label>新的查找<\/label><a href="javascript:void(0);" onclick="parent.helper.pro.findPlayer.goto(this)"><\/a><label id="shield"><\/label>　<a href="javascript:void(0);" onclick="parent.helper.pro.findPlayer.more()">找田<\/a><\/div>
        <div id="field"><label>资源坐标:<\/label><\/div>
    <\/div>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//攻击黑暗敌军
helper.pro.attackMonster && helper.pro.attackMonster.free()
helper.pro.attackMonster = {
    /*
    config: [
        {type:43, pt:1, active:!0, name:"Lujun", text:"黑暗陆军", relative: 1, min:-13, max:6, ll:1, lh:86, step:1},
        {type:42, pt:1, active:!0, name:"Haijun", text:"黑暗海军", relative: 1, min:-13, max:6, ll:1, lh:86, step:1},
        {type:41, pt:1, active:!0, name:"Kongjun", text:"黑暗空军", relative: 1, min:-13, max:6, ll:1, lh:86, step:1},
        {type:61, pt:1, active:!0, name:"Thor-1", text:"黑雷神陆军", relative: 1, min:-13, max:6, ll:80, lh:106, step:1},
        {type:9031, pt:1, active:!1, name:"Mecha", text:"黑暗机甲", relative: 0, min:1, max:5, ll:1, lh:5, step:1}
    ],
    *\/
    setting: {
        group:[
            {id:43, selected:1, min:0, max:0},
            {id:42, selected:1, min:0, max:0},
            {id:41, selected:1, min:0, max:0},
            {id:61, selected:1, min:0, max:0}
            //四国
            //{id:9023, selected:1, min:0, max:0},
            //{id:9022, selected:1, min:0, max:0},
            //{id:9021, selected:1, min:0, max:0},
            //{id:9031, selected:1, min:0, max:0}
        ], 
        preset:1, 
        count:1, 
        interval:1, 
        precheck:1,
        energy:0,
        quintic:0 
    },

    state: {counter:0, lasttime:0, running:!1},

    get config() {
        var m = __require("WorldMonsterModel").WorldMonsterModel.Instance
        var u = __require("WorldMapMonsterSearchComponentNew").default
        var v = __require("KVKTools")
        var l = __require("LocalManager")
        var y = __require("TableManager")
        var N = __require("TableName")
        var o = new u, a = [], cmin, cmax, text

        //备份上下文
//        var b = {_type: m._type, selectMonsterId: m.selectMonsterId}
        var b = Object.assign({}, m)

        //怪物及等级
        o.init(), m._type = 1
        m.monsterList.forEach(e=>{
            var i = y.TABLE.getTableDataById(N.TableName.MONSTER_GROUP, String(e.id)).search_show_kvk
            if (v.default.judgeMonsterStar(i)) {
                cmin = 1
                cmax = 5
            }
            else {
                m.selectMonsterId = e.id
                o.updateMonsterLevelLimit()
                cmin = Math.max(m.monsterSearchMinLevel, 1)
                cmax = m.monsterSearchMaxLevel
            }
            text = l.LOCAL.getText(e.name)
            a.push({id: e.id, name: e.name, text: text, order: e.order, cmin: cmin, cmax: cmax}) 
        })

        //还原上下文
//        m._type = b._type
//        m.selectMonsterId = b.selectMonsterId
        Object.assign(m, b)
        
        //按照order排序
        a.sort((e,t)=>t.order-e.order)
        return a
    },

    _march(ti) {
        var context = helper.battle.backup()
        try {
            var wme = new(__require("NWorldMapEnemy").default)
            Object.assign(wme, {tileInfo:ti}).onBtnClickAtack(null, this.setting.quintic.toString())  //0-单次攻击 1-连续攻击
            return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()            //设置英雄和士兵并出征
        }
        finally {
            helper.battle.restore(context);
        }
    },

    async _attack(p) {
        var wmc = __require("NWorldMapController").default.instance
        var ti = (wmc.updateTileInfo(p, 0), wmc.getTileInfoByCoord(p.x, p.y, p.k, 0));
        if (ti && await helper.battle.mutex.acquire(2000) ) {
            try {
                return await this._march(ti);        //出征
            }
            finally {
                helper.battle.mutex.release();
            }
        }
    },

    \/*
      黑暗陆军    groupType=43, pointType=1
      黑暗海军    groupType=42, pointType=1
      黑暗空军    groupType=41, pointType=1
      黑雷神陆军  groupType=61, pointType=1
      黑暗机甲    groupType=9031, pointType=1
    *\/ 
    _search(task) {
        return send(RequestId.WORLD_SEARCH_MONSTER, {
                    minLevel: task.min,
                    maxLevel: task.max,
                    groupType: task.id,
                    pointType: 1
               })
    },

    //补充体力
    _charge() {
        if (this.setting.energy) {
            for(var e of UserData.getItemList()) {
                if (6 === e.Data.type && e.Amount > 0) {
                    return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId});
                }
            }
        }
        return 0
    },

    //体力检查  
    async _energy(task) {
        //计算任务体力
        var y = __require("TableManager").TABLE.getTableDataById("monster_group", task.id.toString())
        var t = __require("FWSTool").Obj.getPropertyByNames(y, 0, "cost_energy")
        var s = UserData.getEnergy(1).Point
        if (1 == this.setting.quintic) {
            var n = __require("GameTools").default.getDataConfigData(930203)
            var b = __require("GameTools").default.getDataConfigData(930202)
            t = t * Number(b) * Number(n)
        }
        return (t <= s ? 1 : await this._charge() ? 2 : 0)
    },

    //检查编队
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队检查
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  

            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0

            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    async _execute(task) {
        //行军队列、预设英雄士兵
        if (task && UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck()) {
            //检查体力
            switch (await this._energy(task)) {
                case 2:
                    //自动补充体力,重新执行任务 
                    return this._execute(task)
                case 1:
                    //体力检查通过,查找并攻击 
                    var o = await this._search(task)
                    o = o && o.point && await this._attack(o.point)
                    o && o.marchInfo && (this.state.counter++, this.state.lasttime=o.marchInfo.marchStartTime, this._update())
                    o && o.marchInfo || await sleep(5000)
                case 0:
            };
        }
    },

    _newTask() {       
        for (var a = [], s, i = 0; i < this.config.length; ++i) {
            s = this.setting.group.find(e => e.id == this.config[i].id)
            s && s.selected && s.min && s.max && a.push(s)
        }
        return a[Math.floor(Math.random()*a.length)]
    },

    async _onTimer() {
        if (this.state.counter < this.setting.count && !this.busy) {
            try {this.busy = 1, await this._execute(this._newTask())} finally{this.busy = 0}
        }        
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), this.setting.interval*1000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },
    
    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("attack-monster", JSON.stringify({setting:this.setting, state:this.state}))        
    },

    async _load() {
        var o = await getItem("attack-monster")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "attack-monster") {
            var e = {param:{}, group:[], state:{}};
            e.param.preset = this.setting.preset,
            e.param.count = this.setting.count,
            e.param.interval = this.setting.interval,
            e.param.precheck = this.setting.precheck,
            e.param.energy = this.setting.energy,
            e.param.quintic = this.setting.quintic,
            e.state.counter = this.state.counter,
            e.state.running = this.state.running;

            for(var c of this.config) {
                var s = this.setting.group.find(e=>e.id == c.id)
                var t = {id:c.id, text: c.text, cmin: c.cmin, cmax: c.cmax, selected: s ? s.selected : !1, min: s ? s.min: c.cmin, max: s ? s.max : c.cmax}
                e.group.push(t)
            }
            iframe.contentWindow.render(e);
        }
    },

    start() {
        if (!this.state.running && this.setting.count) {
            this.state.running = !0, this.state.counter = 0, 
            this._start(),
            this._onTimer(),
            this._update();
        }
    },

    stop() {
        if (this.state.running) {
            this.state.running = !1,
            this._stop(), 
            this._update()
        }
    },

    apply(s) {
        //参数修正
        s.preset = s.preset >= 1 && s.preset <= 9 ? s.preset : 9;
        s.count = s.count > 0 ? s.count : 0;
        s.interval = s.interval >= 0 ? s.interval : 1;
        s.group.forEach(e=>{
            if (e.min > e.max) {
                var n = e.max
                e.max = e.min, e.min = n
            }          
        })

        //参数更新
        var o = this.setting.interval; 
        this.setting = s;

        //重置定时器
        this.setting.interval != o && this.timer && (this._stop(), this._start()) 
        this._update();
    },

    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"attack-monster", width:515, height:195+this.config.length*30, html:this.html});
        this._render();
    }
}

helper.pro.attackMonster.html= String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:145px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function editchange(edit) {
        edit.setAttribute("value", Number(edit.value.replace('次','').replace('秒',''))); 
        apply();   
    }

    function listchange(list) {
        var edit = list.parentNode.children["edit"];
        var i = list.selectedIndex;
        edit.value = list.options[i].innerText;
        edit.setAttribute("value", list.options[i].value);
        list.selectedIndex = 0;
        apply();
    }

    function apply() {
        var e = {group:[]};
        e.preset = Number($("#preset").value);
        e.count = Number($("#count").children["edit"].getAttribute("value"));
        e.interval = Number($("#interval").children["edit"].getAttribute("value"));
        e.precheck = $("#precheck").checked; 
        e.energy = $("#energy").checked; 
        e.quintic = Number($("#quintic").checked);
        
        for(var div of $("#group").children) {
            var g = {};
            g.id = Number(div.id.substring(5)),
            g.selected = div.children["selected"].checked,
            g.min = Number(div.children["min"].value),
            g.max = Number(div.children["max"].value),
            e.group.push(g) 
        }

        parent.helper.pro.attackMonster.apply(e)
    }

    function _html(g) {
        for (var options = "", i=g.cmin; i<=g.cmax; i++) options += '<option value=' + i + '>' + i + '级<\/option>' 
        return '<div id=type-' + g.id + '>' +
               '    <input type="checkbox" name="selected" onclick="apply()"><label class="caption">' + g.text + '<\/label>' + 
               '    <span><\/span><label>最低等级：<\/label>' + 
               '    <select name="min" class="combo-list" onchange="apply()">' + options + '<\/select>' + 
               '    <span><\/span><label>最高等级：<\/label>' + 
               '    <select name="max" class="combo-list" onchange="apply()">' + options + '<\/select>' +
               '<\/div>'
    }

    function render(e) {
        $("#preset").value = e.param.preset;
        $("#count").children["edit"].value = (99999 == e.param.count) ? '无限次' : e.param.count + '次'
        $("#count").children["edit"].setAttribute("value",e.param.count)
        $("#interval").children["edit"].value = e.param.interval + '秒'
        $("#interval").children["edit"].setAttribute("value", e.param.interval)
        $("#precheck").checked = e.param.precheck
        $("#energy").checked = e.param.energy
        $("#quintic").checked = e.param.quintic
        $("#counter").innerText = e.state.counter ? '已攻击' + e.state.counter +'次' : ''
        $("#counter").style.color = e.state.counter >= e.param.count ? "green" : e.state.running ? "purple" : "black"
        $("#state").innerText = e.state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = e.state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"
        $("#action").innerText = e.state.running ? "停止" : "启动"

        $("#group").innerHTML = "";
        for(var g of e.group) $("#group").innerHTML += _html(g)
        for(g of e.group) {
            $("#type-"+g.id).children["selected"].checked= g.selected
            $("#type-"+g.id).children["min"].value = g.min
            $("#type-"+g.id).children["max"].value = g.max
        }

        $("#group").style.height = 30 * e.group.length + 4
    }

    function action() {
        var o = parent.helper.pro.attackMonster
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>攻击黑暗敌军<\/h3>
    <div class="panel">
        <label>编队：<\/label>
        <select id="preset" class="combo-list" onchange="apply()">
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <span><\/span><span><\/span><label>间隔：<\/label>
        <div id="interval" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1秒<\/option>
                <option value="30">30秒<\/option>
                <option value="60">60秒<\/option>
                <option value="300">300秒<\/option>
                <option value="600">600秒<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <span><\/span><span><\/span><label>次数：<\/label>
        <div id="count" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1次<\/option>
                <option value="5">5次<\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <br>
        <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
        <span><\/span>
        <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <span><\/span>
        <input type="checkbox" id="quintic" onclick="apply()"><label>连续攻击<\/label>
        <span><\/span>
        <span id="counter">已攻击怪物99999次<\/span>
    <\/div>
    <div id="group" class="panel">
        <div>
            <input type="checkbox" name="selected" onclick="apply()"><label class="caption">黑暗陆军<\/label>
            <span><\/span><label>最低等级：<\/label>
            <select name="min" class="combo-list" onchange="apply()">
                <option value="67">67级<\/option>
            <\/select>
            <span><\/span><label>最高等级：<\/label>
            <select name="max" class="combo-list" onchange="apply()">
                <option value="67">67级<\/option>
            <\/select>
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//自动发起集结
helper.pro.createAssembly && helper.pro.createAssembly.free()
helper.pro.createAssembly = {
    setting: {
        group:[
            {id: 44, selected: 1, min: 10, max: 10},
            {id: 9100, selected: 0, min: 5, max: 5},
            {id: 6, selected: 0, min: 10, max: 10}
        ], 

\/*  四国
    config: [
        {type:9024, pt:3, active:!0, name:"Hammer", text:"战锤-4000", relative: 1, min:-70, max:0, step:10},
        {type:9032, pt:3, active:!0, name:"Pioneer", text:"黑暗精卫", relative: 0, min:1, max:5, step:1},
        {type:6, pt:4, active:!0, name:"Rattat", text:"爱心砰砰", relative: 1, min:-70, max:0, step:10}
    ],

    setting: {
        group:[
            {type:9024, selected:1, min:0, max:0},
            {type:9032, selected:0, min:5, max:5},
            {type:6, selected:0, min:0, max:0}
        ], 
*\/
        preset:1, 
        count:1, 
        interval:1, 
        precheck:1,
        energy:0
    },

    state:{counter:0, lasttime:0, running:!1},   

    get config() {
        var m = __require("WorldMonsterModel").WorldMonsterModel.Instance
        var D = __require("ActivityController").ActivityController.Instance
        var C = __require("WorldMapMonsterSearchComponentNew").default
        var u = __require("GameTools")
        var v = __require("KVKTools").default
        var l = __require("LocalManager")
        var y = __require("TableManager")
        var N = __require("TableName")
        var a = [], o = new C, cmin, cmax, step, text, type
    
        //备份上下文
        var b = Object.assign({}, m)

        m.resetData()
        o._thorScienceMonsterBuff = o.getThorScienceMonsterBuff()
        o.init()

        //添加集结配置
        m.assembleMonsterList.forEach(e=>{
            var i = y.TABLE.getTableDataById("monster_group", String(e.id)).search_show_kvk   
            if (v.judgeMonsterStar(i)) {   //黑暗精卫
                cmin = 1
                cmax = 5
                step = 1
                type = 3
            }
            else if (e.id == u.default.getDataConfigData(941304)) {   //俱星-4000
                o.setThorScienceMonsterSearchLevel()
                cmin = o._minLevel
                cmax = o._maxLevel
                mtype = 9
                step = 1
                type = 9
            }
            else {   //战锤-4000
                cmin = 10
                cmax = parseInt(UserData.Level \/ 10) * 10
                step = 10
                type = 3
            }
            text = l.LOCAL.getText(e.name)
            a.push({id: e.id, type: type, name: e.name, text: text, order: e.order, cmin: cmin, cmax: cmax, step: step}) 
        })

        //爱心砰砰活动
        if (D.getLimitHammerBossExchangeActivityId("4", !0) > 0) {
            var s = y.TABLE.getTableDataById(N.TableName.MONSTER_GROUP, "6")
            cmin = 10
            cmax = parseInt(UserData.Level \/ 10) * 10
            step = 10
            text = l.LOCAL.getText(s.name)
            type = 4
            a.push({id: s.id, type: type, name: s.name, text: text, order: s.order, cmin: cmin, cmax: cmax, step: step})
        }

        //还原上下文
        Object.assign(m, b)
        return a
    },
    
    _march(ti) {
        var context = helper.battle.backup()
        try {
            //集结, 出征
            var wma = new(__require("NWorldMapAssemblyEnemyComponent").default)
            Object.assign(wma, {tileInfo:ti}).StartAssembly(null, 0)
            return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()   
        }
        finally {
            helper.battle.restore(context)
        }
    },

    async _assembly(p) {
        var wmc = __require("NWorldMapController").default.instance
        var ti = (wmc.updateTileInfo(p, 0), wmc.getTileInfoByCoord(p.x, p.y, p.k, 0));
        if (ti && await helper.battle.mutex.acquire(2000) ) {
            try {
                //集结, 出征
                return await this._march(ti)
            }
            finally {
                helper.battle.mutex.release()    
            }
        }
    },

    \/*
      type: 6-爱心砰砰
           44-战锤-4000
         9100-俱星-4000
             
    *\/ 
    _search(task) {
        return send(RequestId.WORLD_SEARCH_MONSTER, {
                        minLevel: task.min,
                        maxLevel: task.max,
                        groupType: task.id,
                        pointType: task.type})
    },

    //补充体力
    _charge() {
        if (this.setting.energy) {
            for(var e of UserData.getItemList()) {
                if (6 === e.Data.type && e.Amount > 0) {
                    return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId});
                }
            }
        }
        return 0 
    },

    //体力检查  
    async _energy(task) {
        //计算任务体力
        var y = __require("TableManager").TABLE.getTableDataById("monster_group", task.id.toString())
          , t = __require("FWSTool").Obj.getPropertyByNames(y, 0, "cost_energy")
          , s = UserData.getEnergy(1).Point;
        return (t <= s ? 1 : await this._charge() ? 2 : 0)
    },

    //编队检查
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  

            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0
 
            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    async _execute(task) {
        //检查次数、行军队列、英雄及士兵、体力
        if (task && UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck()) {
            //检查体力
            switch (await this._energy(task)) {
                case 2: 
                    //自动补充体力,重新执行任务 
                    return this._execute(task)
                case 1: 
                    //体力检查通过,查找并发起集结 
                    var o = await this._search(task)
                    o = o && o.point && await this._assembly(o.point)
                    o && o.marchInfo && (this.state.counter++, this.state.lasttime=o.marchInfo.marchStartTime, this._update())
                    o && o.marchInfo || await sleep(5000)
                case 0:
            };
        }
    },

    _newTask() {       
        for (var a = [], s, i = 0; i < this.config.length; ++i) {
            s = this.setting.group.find(e => e.id == this.config[i].id)
            s && s.selected && s.min && s.max && a.push({id: s.id, type: this.config[i].type, min: s.min, max: s.max})
        }
        return a[Math.floor(Math.random()*a.length)]
    },

    async _onTimer() {
        if (this.state.counter < this.setting.count && !this.busy) {
            try {this.busy = 1, await this._execute(this._newTask())} finally{this.busy = 0}
        }
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), this.setting.interval*1000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },
    
    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("create-assembly", JSON.stringify({setting:this.setting, state:this.state}))        
    },

    async _load() {
        var o = await getItem("create-assembly")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "create-assembly") {
            var e = {param:{}, group:[], state:{}};
            e.param.preset = this.setting.preset,
            e.param.count = this.setting.count,
            e.param.interval = this.setting.interval,
            e.param.energy = this.setting.energy,
            e.param.precheck = this.setting.precheck,
            e.state.counter = this.state.counter,
            e.state.running = this.state.running;

            for(var c of this.config) {
                var s = this.setting.group.find(e=>e.id == c.id)
                var t = {id:c.id, text: c.text, cmin: c.cmin, cmax: c.cmax, step: c.step, selected: s ? s.selected : !1, min: s ? s.min: c.cmin, max: s ? s.max : c.cmax}
                e.group.push(t)
            }

            iframe.contentWindow.render(e)
        }
    },

    start() {
        if (!this.state.running && this.setting.count) {
            this.state.running = !0, this.state.counter = 0, 
            this._start(),
            this._onTimer(),
            this._update();
        }
    },

    stop() {
        if (this.state.running) {
            this.state.running = !1,
            this._stop(), 
            this._update()
        }
    },

    apply(s) {
        //参数修正
        s.preset = s.preset >= 1 && s.preset <= 9 ? s.preset : 9;
        s.count = s.count > 0 ? s.count : 0;
        s.interval = s.interval >= 0 ? s.interval : 1;
        s.group.forEach(e=>{
            if (e.min > e.max) {
                var n = e.max
                e.max = e.min, e.min = n
            }          
        })

        //参数更新
        var o = this.setting.interval
        this.setting = s
        
        //重置计时器
        this.setting.interval != o && this.timer && (this._stop(), this._start()) 
        this._update();
    },

    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"create-assembly", width:515, height:190+this.config.length*30, html:this.html});
        this._render();
    }
}

helper.pro.createAssembly.html = String.raw 
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; margin-left:123px; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:145px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function editchange(edit) {
        edit.setAttribute("value", Number(edit.value.replace('次','').replace('秒',''))); 
        apply();   
    }

    function listchange(list) {
        var edit = list.parentNode.children["edit"];
        var i = list.selectedIndex;
        edit.value = list.options[i].innerText;
        edit.setAttribute("value", list.options[i].value);
        list.selectedIndex = 0;
        apply();
    }

    function apply() {
        var e = {group:[]};
        e.preset = Number($("#preset").value);
        e.count = Number($("#count").children["edit"].getAttribute("value"));
        e.interval = Number($("#interval").children["edit"].getAttribute("value"));
        e.precheck = $("#precheck").checked; 
        e.energy = $("#energy").checked; 
        
        for(var div of $("#group").children) {
            var g = {};
            g.id = Number(div.id.substring(5)),
            g.selected = div.children["selected"].checked,
            g.min = Number(div.children["min"].value),
            g.max = Number(div.children["max"].value),
            e.group.push(g) 
        }

        parent.helper.pro.createAssembly.apply(e)
    }

    function _html(g) {
        for (var options = "", i=g.cmin; i<=g.cmax; i=i+g.step) options += '<option value=' + i + '>' + i + '级<\/option>' 
        return '<div id=type-' + g.id + '>' +
               '    <input type="checkbox" name="selected" onclick="apply()"><label class="caption">' + g.text + '<\/label>' + 
               '    <span><\/span><label>最低等级：<\/label>' + 
               '    <select name="min" class="combo-list" onchange="apply()">' + options + '<\/select>' + 
               '    <span><\/span><label>最高等级：<\/label>' + 
               '    <select name="max" class="combo-list" onchange="apply()">' + options + '<\/select>' +
               '<\/div>'
    }

    function render(e) {
        for (var html="", i=0; i<e.group.length; ++i) html = html.concat(_html(e.group[i]))
        $("#group").innerHTML = html
        
        $("#preset").value = e.param.preset;
        $("#count").children["edit"].value = (99999 == e.param.count) ? '无限次' : e.param.count + '次';
        $("#count").children["edit"].setAttribute("value",e.param.count);
        $("#interval").children["edit"].value = e.param.interval + '秒';
        $("#interval").children["edit"].setAttribute("value", e.param.interval);
        $("#energy").checked = e.param.energy;
        $("#precheck").checked = e.param.precheck;
        $("#counter").innerText = e.state.counter ? '已发起' + e.state.counter +'次集结' : ''
        $("#counter").style.color = e.state.counter >= e.param.count ? "green" : e.state.running ? "purple" : "black"
        $("#state").innerText = e.state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = e.state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"
        $("#action").innerText = e.state.running ? "停止" : "启动";

        for(var g of e.group) {
            var children = $("#type-"+g.id).children
            children["selected"].checked= g.selected
            children["min"].value = g.min
            children["max"].value = g.max
        }
    }

    function action() {
        var o = parent.helper.pro.createAssembly
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>自动发起集结<\/h3>
    <div class="panel">
        <label>编队：<\/label>
        <select id="preset" class="combo-list" onchange="apply()">
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <span><\/span><span><\/span><label>间隔：<\/label>
        <div id="interval" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1秒<\/option>
                <option value="30">30秒<\/option>
                <option value="60">60秒<\/option>
                <option value="300">300秒<\/option>
                <option value="600">600秒<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <span><\/span><span><\/span><label>次数：<\/label>
        <div id="count" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1次<\/option>
                <option value="5">5次<\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <br>
        <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
        <span><\/span>
        <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <span><\/span>
        <span id="counter">已发起99999次集结<\/span>
    <\/div>
    <div id="group" class="panel">
        <div>
            <input type="checkbox" name="selected" onclick="apply()"><label class="caption">战锤-4000<\/label>
            <span><\/span><label>最低等级：<\/label>
            <select name="min" class="combo-list" onchange="apply()">
                <option value="67">67级<\/option>
            <\/select>
            <span><\/span><label>最高等级：<\/label>
            <select name="max" class="combo-list" onchange="apply()">
                <option value="67">67级<\/option>
            <\/select>
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//自动拯救难民
helper.pro.helpRefugee && helper.pro.helpRefugee.free()
helper.pro.helpRefugee = {
    setting: { 
       preset:1, 
       count:1, 
       interval:1, 
       precheck:1,
       energy:0
    },

    state:{counter:0, lasttime:0, running:!1},

    _march(ti) {
        var context = helper.battle.backup()
        try {
            //集结, 出征
            Object.assign(new (__require("NWorldUIRefugeeCamp").default), {_tileInfo:ti, _id:ti.id}).startAssembly(null, 0)  // 0-普通集结 1-超级集结
            return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()   
        }
        finally {
            helper.battle.restore(context)
        }
    },

    async _assembly(p) {
        var c = __require("NWorldMapController").default.instance
        var ti = (c.updateTileInfo(p, 0), c.getTileInfoByCoord(p.x, p.y, p.k, 0))
        if (ti && await helper.battle.mutex.acquire(2000) ) {
            try {
                //集结, 出征
                return await this._march(ti)
            }
            finally {
                helper.battle.mutex.release()    
            }
        }
    },
 
    async _point(p) {
        var o = await send(RequestId.GET_WORLD_INFO, {
                            x: p.x,
                            y: p.y,
                            k: UserData.ServerId,
                            rid: 0,
                            width: 14,
                            height: 20,
                            marchInfo: !1,
                            viewLevel: 0})
        return o && (o=o.pointList) && o.find(e=>{return e.x == p.x && e.y == p.y})
    },
 
    //使用求救信
    async _useLetter() {
        var itemid = __require("GameDefine").ActivityItem.refugeeLetter
        var amount = UserData.getItemAmount(itemid)
        if (amount > 0) {    
            //禁止跳转
            var _doJump = __require("NWorldMapTodoController").NWorldMapTodoController._instance.doJump
            __require("NWorldMapTodoController").NWorldMapTodoController._instance.doJump = (e)=>{e.click && _doJump(e)}
            try {
                return await send(RequestId.ITEM_USE, {amount:1, itemid:itemid})
            }
            finally {
                //恢复跳转
                __require("NWorldMapTodoController").NWorldMapTodoController._instance.doJump = _doJump
            }
        }
    },
 
    //查找难民
    _search() {
        return send(RequestId.GetRefugee, {})
    },
 
    //补充体力
    _charge() {
        for(var e of UserData.getItemList()) if (6 === e.Data.type && e.Amount > 0) return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId})
    },
 
    //体力检查  
    async _energy() {
        //计算任务体力
        var y = __require("TableManager").TABLE.getTableDataById("monster_group", "18")  //18-Refugee
          , t = __require("FWSTool").Obj.getPropertyByNames(y, 0, "cost_energy")
          , s = UserData.getEnergy(1).Point;
        return (t <= s ? 1 : this.setting.energy && await this._charge() ? 2 : 0)
    },
 
    //编队检查
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) { 
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  
 
            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0
 
            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },
 
    async _execute() {
        //检查次数、行军队列、英雄及士兵、体力
        if (UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck()) {
            //检查体力
            switch (await this._energy()) {
                case 2: 
                    //自动补充体力,重新执行任务
                    return this._execute()
                case 1: 
                    //体力检查通过,查找难民(使用难民信)并发起集结 
                    var o = await this._search()
                    o && o.points && !o.points[0] && await this._useLetter() && (o = await this._search())
                    o && o.points && (o=o.points[0]) && (o = await this._point(o)) && (o = await this._assembly(o))
                    o && o.marchInfo && (this.state.counter++, this.state.lasttime=o.marchInfo.marchStartTime, this._update())
                    o && o.marchInfo || sleep(5000)
                case 0:
            };
        }
    },
 
    async _onTimer() {
        if (this.state.counter < this.setting.count && !this.busy) {
            try {this.busy = 1, await this._execute()} finally{this.busy = 0}
        }
    },
 
    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), this.setting.interval*1000))
    },
 
    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },
    
    _update() {
        this._save()
        this._render()
    },
 
    _save() {
        setItem("help-refugee", JSON.stringify({setting:this.setting, state:this.state}))
    },
 
    async _load() {
        var o = await getItem("help-refugee")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },
 
    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "help-refugee") {
            var e = {param:{}, state:{}};
        
            e.param.preset = this.setting.preset,
            e.param.count = this.setting.count,
            e.param.interval = this.setting.interval,
            e.param.energy = this.setting.energy,
            e.param.precheck = this.setting.precheck,
            e.state.counter = this.state.counter,
            e.state.running = this.state.running
 
            iframe.contentWindow.render(e)
        }
    },
 
    start() {
        if (!this.state.running && this.setting.count) {
            this.state.running = !0, this.state.counter = 0, 
            this._start(),
            this._onTimer(),
            this._update();
        }
    },
 
    stop() {
        if (this.state.running) {
            this.state.running = !1,
            this._stop(), 
            this._update()
        }
    },
 
    apply(s) {
        //参数修正
        s.preset = s.preset >= 1 && s.preset <= 9 ? s.preset : 9
        s.count = s.count > 0 ? s.count : 0
        s.interval = s.interval >= 0 ? s.interval : 1
 
        //参数更新
        var o = this.setting.interval
        this.setting = s
        
        //重置计时器
        this.setting.interval != o && this.timer && (this._stop(), this._start()) 
        this._update()
    },
 
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"help-refugee", width:520, height:172, html:this.html})
        this._render()
    }
}

helper.pro.helpRefugee.html = String.raw 
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; margin-left:123px; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:145px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function editchange(edit) {
        edit.setAttribute("value", Number(edit.value.replace('次','').replace('秒',''))); 
        apply();   
    }

    function listchange(list) {
        var edit = list.parentNode.children["edit"];
        var i = list.selectedIndex;
        edit.value = list.options[i].innerText;
        edit.setAttribute("value", list.options[i].value);
        list.selectedIndex = 0;
        apply();
    }

    function apply() {
        var e = {group:[]};
        e.preset = Number($("#preset").value);
        e.count = Number($("#count").children["edit"].getAttribute("value"));
        e.interval = Number($("#interval").children["edit"].getAttribute("value"));
        e.precheck = $("#precheck").checked; 
        e.energy = $("#energy").checked; 

        parent.helper.pro.helpRefugee.apply(e)
    }

    function render(e) {
        $("#preset").value = e.param.preset
        $("#count").children["edit"].value = (99999 == e.param.count) ? '无限次' : e.param.count + '次'
        $("#count").children["edit"].setAttribute("value",e.param.count)
        $("#interval").children["edit"].value = e.param.interval + '秒'
        $("#interval").children["edit"].setAttribute("value", e.param.interval)
        $("#energy").checked = e.param.energy
        $("#precheck").checked = e.param.precheck
        $("#counter").innerText = e.state.counter ? '已拯救难民' + e.state.counter +'次' : ''
        $("#counter").style.color = e.state.counter >= e.param.count ? "green" : e.state.running ? "purple" : "black"
        $("#state").innerText = e.state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = e.state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = e.state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.helpRefugee
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>自动拯救难民<\/h3>
    <div class="panel">
        <label>编队：<\/label>
        <select id="preset" class="combo-list" onchange="apply()">
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <span><\/span><span><\/span><label>间隔：<\/label>
        <div id="interval" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1秒<\/option>
                <option value="30">30秒<\/option>
                <option value="60">60秒<\/option>
                <option value="300">300秒<\/option>
                <option value="600">600秒<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <span><\/span><span><\/span><label>次数：<\/label>
        <div id="count" class="combo-box">
            <select name="list" class="combo-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1次<\/option>
                <option value="5">5次<\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="combo-edit" onchange="editchange(this)">
        <\/div>
        <br>
        <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
        <span><\/span>
        <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <span><\/span>
        <span id="counter">已拯救难民99999次<\/span>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//自动加入集结
helper.pro.joinAssembly && helper.pro.joinAssembly.free()
helper.pro.joinAssembly = {
    //id=12 - 战锤
    //id=18 - 难民营
    //id=74 - 军团据点
    //id=86 - 俱星
    config: [
        {id:1, active:!0, name:"Hammer",      text:"战锤-4000"},
        {id:2, active:!0, name:"RefugeeCamp", text:"难民营"},
        {id:3, active:!0, name:"Legion",      text:"军团据点"},
        {id:4, active:!0, name:"Allstar",     text:"俱星-4000"},
        {id:5, active:!0, name:"Rattat",      text:"爱心砰砰"},
        {id:6, active:!0, name:"Pioneer",     text:"黑暗精卫"}
    ],

    setting: [
        {id:1, selected:!0, count:50, preset:0, delay:3, limit:!1, leader:""},
        {id:2, selected:!0, count:10, preset:0, delay:3, limit:!1, leader:""},
        {id:3, selected:!0, count:50, preset:0, delay:3, limit:!1, leader:""},
        {id:4, selected:!1, count:10, preset:0, delay:3, limit:!1, leader:""},
        {id:5, selected:!1, count:50, preset:0, delay:3, limit:!1, leader:""},
        {id:6, selected:!1, count:50, preset:0, delay:3, limit:!1, leader:""}
    ],

    state: {counter:{}, running:!1},

    deferred: [],

    _id(asseml) {
        if (asseml && 12 == asseml.pointType && (44 == asseml.itemId || 9024 == asseml.itemId)) return 1
        if (asseml && 18 == asseml.pointType) return 2
        if (asseml && 74 == asseml.pointType) return 3
        if (asseml && 86 == asseml.pointType) return 4
        if (asseml && 14 == asseml.pointType) return 5
        if (asseml && 12 == asseml.pointType && (9132 == asseml.itemId)) return 6         //9132:精卫
    },
    
    _join(asseml) {
        var context = helper.battle.backup();
        try {
            var a = __require("AllianceAssemlbyPanelNew").default
            a.AttackCityinfo(__require("BattleData").BattleType.PVP_Alliance_Assembly_Join, asseml)         //加入
            var preset = this.setting.find(e=>e.id == this._id(asseml)).preset
            var maxNum = asseml.rallyCapacity - asseml.rallySize
            return helper.battle.setup(preset, maxNum) && helper.battle.march()   //出征
        }
        finally {
            helper.battle.restore(context)
        }
    },

    //编队检查
    _precheck(preset) {
        //单兵检查(含机甲)
        if (0 == preset || 9 == preset) { 
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队
        if (0 < preset && preset < 9) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
            if (!march) return 0  
    
            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0
 
            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    _distance(p1,p2) {
        return Math.sqrt(Math.pow(p1.x-p2.x, 2) + Math.pow(p1.y-p2.y, 2))
    },
 
    _check(asseml) {
        var MarchType = __require("WorldMapCommon").MarchType

        var i = asseml.marchType == MarchType.ALLIANCE_SUPER_RALLY_BATTLE ? "61057" : asseml.marchType == MarchType.ALLIANCE_RALLY_MIX_BATTLE ? "770013" : "8005"
          , n = parseInt(__require("FWSTool").Obj.getProperty(__require("TableManager").TABLE.getTableDataById("data_config", i), "value", "5"))  //允许成员数
          , c = this.config.find(e=>e.id == this._id(asseml))                       //配置项
          , s = this.setting.find(e=>e.id == this._id(asseml))                      //设置项
          , k = this.state.counter && c && this.state.counter[c.name] ? this.state.counter[c.name] : 0   //已加入次数
          
            //检查行军数量、设置控制、及集结本身
        return UserData.myMarchNum < UserData.myMarchNumMAX &&
            c && c.active && s && s.selected &&  k < s.count && this._precheck(s.preset) &&
            asseml.marchState == __require("WorldMapCommon").MarchState.INIT &&
            asseml.members.find(e=>e.uid == UserData.UID) == undefined && 
            asseml.members.length < n && 
            asseml.leaderName.includes(s.leader) &&
            asseml.rallyCapacity - asseml.rallySize > 0 &&
            (
                !s.limit ||
                this._distance(asseml.leaderPos, UserData._WorldCoord)<100 &&       //本人与集结发起者距离
                this._distance(asseml.leaderPos, asseml.targetPos)<200              //集结发起者与目标距离
            )
    },

    async _process() {
        var AllianceAssemlData = __require("AllianceAssemlbyController").default.getInstance().AllianceAssemlData

        //查找并加入集结(异步并发控制)
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                for(var asseml of AllianceAssemlData) {
                    var i = this.deferred.indexOf(asseml.teamId)
                    var o = i<0 && this._check(asseml) && await this._join(asseml)
                    var c = o && this.config.find(e=>e.id == this._id(asseml))
                    c && (this.state.counter[c.name] = this.state.counter[c.name] ? this.state.counter[c.name]+1 : 1, this._update())     
                }
            }
            finally {
                helper.battle.mutex.release()
            }   
        }
    },

    _onTimeout(teamId) {
        //从延迟加入列表摘除
        var i = this.deferred.indexOf(teamId)
        i>=0 && this.deferred.splice(i,1)
        this._process()
    },

    onAssemblyCreate(asseml) {
        console.log("收到发起集结数据:", asseml)

        var s = this.setting.find(e=>e.id == this._id(asseml))
          , c = this.config.find(e=>e.id == this._id(asseml))
          , n = this.state.counter && c && this.state.counter[c.name] ? this.state.counter[c.name] : 0;   //已加入次数
        if (c && s) {
            c.active && s.selected && n < s.count && asseml.leaderName.includes(s.leader) && (
                this.deferred.push(asseml.teamId),
                setTimeout(e=>this._onTimeout(e), s.delay*1000, asseml.teamId)
            )
        } //else console.log(asseml);
    },

    onMyMarchUpdate(e) {
        var o = JSON.parse(e)
        4 == o.marchInfo.state && this._process()
    },

    _onEvent() {
        __require("EventCenter").EVENT.on(__require("EventId").EventId.AssemblyCreate, this.onAssemblyCreate, this),  //监听创建集结事件
        __require("EventCenter").EVENT.on(__require("EventId").EventId.My_March_Update, this.onMyMarchUpdate, this)   //监听修改行军事件
    },

    _offEvent() {
        __require("EventCenter").EVENT.off(__require("EventId").EventId.AssemblyCreate, this.onAssemblyCreate, this), //监听创建集结事件
        __require("EventCenter").EVENT.off(__require("EventId").EventId.My_March_Update, this.onMyMarchUpdate, this)  //监听修改行军事件
    },

    async _start() {
        this._onEvent(), this._process()
    },

    _stop() {
        this._offEvent()
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("join-assembly", JSON.stringify({setting:this.setting, state:this.state}))
    },

    async _load() {
        var o = await getItem("join-assembly")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "join-assembly") {
            var state = iframe.contentWindow.document.getElementById("state")
              , action = iframe.contentWindow.document.getElementById("action");

            // 渲染状态启停
            state.innerText = this.state.running ? "运行中" : "未运行"
            state.style.backgroundColor = this.state.running ? "greenyellow" : "#aaa"
            state.style.borderRadius = "2px"
            action.innerText = this.state.running ? "停止" : "启动";
    
            //渲染设置面板
            for (var s of this.setting) {
                var div = iframe.contentWindow.document.getElementById(s.id.toString());
                if (div) {
                    var c = this.config.find(e=>e.id == s.id)
                      , n = this.state.counter && this.state.counter[c.name]

                    div.children["selected"].checked = s.selected,
                    div.children["selected"].disabled = !c.active,
                    div.children["count"].children["edit"].value = 99999==s.count ? "无限次" : s.count+"次",
                    div.children["count"].children["edit"].setAttribute("value", s.count);                    
                    div.children["count"].children["edit"].disabled = !c.active,
                    div.children["count"].children["list"].disabled = !c.active,
                    div.children["preset"].value = s.preset,
                    div.children["preset"].disabled = !c.active,
                    div.children["delay"].value = s.delay,
                    div.children["delay"].disabled = !c.active,
                    div.children["limit"].checked = s.limit,
                    div.children["limit"].disabled = !c.active,
                    div.children["leader"].value = s.leader,
                    div.children["leader"].disabled = !c.active,
                    div.getElementsByTagName("p")[0].children["info"].innerText = n ? "已参加" + n + "次" : "　",
                    div.getElementsByTagName("p")[0].children["info"].style.color = s.count <= n ? "green" : this.state.running && s.selected ? "purple" : "black";
                }
            }
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },

    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },

    apply(setting) {
        for (var s of setting) {
            var a = this.setting.find((e)=>{ return e.id == s.id})
            a && (
                a.selected = s.selected,
                a.count = s.count,
                a.preset = s.preset,
                a.delay = s.delay,
                a.limit = s.limit,
                a.leader = s.leader
            )
        }
        this._update()
        this._process()
    },

    dayInit() {
        this.state.counter = {}, this._update()
    },

    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"join-assembly", width:680, height:445, html:this.html})
        this._render()
    }
}

helper.pro.joinAssembly.html = String.raw
`<html charset="UTF-8">
<head>
    <style>
        body{line-height:22px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
        h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
        p{display:inline-block; margin:0px; height:22px; width:100%;}
        div{display:inline-block; position:relative; }
        label{margin-right:0px;}
        input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:8px; padding-top:2px; height:20px;}
        input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:4px; width:14px; height:14px;}
        select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; margin-right:8px; padding-top:1px; width:50px; height:20px; }
        button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
        button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
        input::-webkit-input-placeholder{color: #aaa;}
        #state{margin-left:10px; text-align:center; height:20px}
        #action{margin-left:225px; margin-top:8px; text-align:center; width:80px;}
    
        div.panel{display:block; border:1px solid silver; border-radius:6px; margin:8px; margin-top:4px; margin-bottom:8px; padding-left:8px; padding-top:6px; box-shadow: 3px 3px 6px gray;}
        .input-leader{width:90px; padding-top:0px} .input-preset{width:60px} .input-delay{width:50px}
        .count-list{width:64px}
        .count-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
        .label-text{width:70px; display:inline-block;}
        .label-info{display:inline-block; color:green; margin-left:3px; width:100%;}
    <\/style>        
    <script>
        function editchange(edit) {
            edit.setAttribute("value", Number(edit.value.split("次")[0])); 
            apply();   
        }

        function listchange(list) {
            var edit = list.parentNode.children["edit"];
            var i = list.selectedIndex;
            edit.value = list.options[i].innerText;
            edit.setAttribute("value", list.options[i].value);
            list.selectedIndex = 0;
            apply();
        }

        function apply() {
            var nodes = document.body.getElementsByClassName("panel")
            var setting=[]
            for (var div of nodes) {
                var id = Number(div.id)
                  , selected = div.children["selected"].checked
                  , count = Number(div.children["count"].children["edit"].getAttribute("value"))
                  , preset = Number(div.children["preset"].value)
                  , delay = Number(div.children["delay"].value)
                  , limit = div.children["limit"].checked
                  , leader = div.children["leader"].value
                setting.push({id:id, selected:selected, count:count, preset:preset, delay:delay, limit:limit, leader:leader})
            }
            parent.helper.pro.joinAssembly.apply(setting)
        }

        function action() {
            var o = parent.helper.pro.joinAssembly
            o.state.running ? o.stop() : o.start()
        }
    <\/script>
<\/head>
<body>
    <h3>自动加入集结<\/h3>
    <div id="1" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">战锤-4000<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()"><br>
        <p><span name="info" class="label-info"><\/span><\/p>
    <\/div>
    <div id="2" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">难民营<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()"><br>
        <p><span name="info" class="label-info"><\/span><\/p>
    <\/div>
    <div id="3" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">军团据点<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()"><br>
        <p><span name="info" class="label-info"><\/span><\/p>
    <\/div>
    <div id="4" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">俱星-4000<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()"><br>
        <p><span name="info" class="label-info"><\/span><\/p>
    <\/div>
    <div id="5" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">爱心砰砰<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()"><br>
        <p><span name="info" class="span-info"><\/span><\/p>
    <\/div>
    <div id="6" class="panel">
        <input type="checkbox" name="selected" onclick="apply()"><label class="label-text">黑暗精卫<\/label>
        <label>次数:<\/label>
        <div name="count">
            <select name="list" class="count-list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="10">10次<\/option>
                <option value="50">50次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input name="edit" class="count-edit" onchange="editchange(this)">
        <\/div>
        <label>编队:<\/label>
        <select name="preset" class="input-preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <label>延迟:<\/label>
        <select name="delay" class="input-delay" onchange="apply()">
            <option value="0">0秒<\/option>
            <option value="1">1秒<\/option>
            <option value="2">2秒<\/option>
            <option value="3">3秒<\/option>
            <option value="4">4秒<\/option>
            <option value="5">5秒<\/option>
            <option value="6">6秒<\/option>
            <option value="7">7秒<\/option>
            <option value="8">8秒<\/option>
            <option value="9">9秒<\/option>
        <\/select>
        <input type="checkbox" name="limit" onclick="apply()"><label style="margin-right:10px">限定距离<\/label>
        <label>指定:<\/label>
        <input type="text" name="leader" class="input-leader" placeholder="玩家名字" onchange="apply()">
        <p><span name="info" class="label-info"><\/span><\/p>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//自动采集资源
helper.pro.gatherResource && helper.pro.gatherResource.free()
helper.pro.gatherResource = {
    setting: [
        {selected: !1, type: 0, option: 0},
        {selected: !1, type: 0, option: 0},
        {selected: !1, type: 0, option: 0},
        {selected: !1, type: 0, option: 0},
        {selected: !0, type: 1, option: 3},
        {selected: !0, type: 2, option: 3},
        {selected: !0, type: 1, option: 3},
        {selected: !0, type: 2, option: 3}
    ],
    state: {
        running: !1
    },

    _records(type) {
        var a = ['谷仓', '炼油', '采金'],  o = []
        __require("AllianceRecordController").default.instance.getDataByType(4).forEach(e=>ServerTime-e.tampTime < 14400 && e.msg.includes(a[type-1]) && o.push(e))
        o.sort((d,e)=>{
            var l1 = d.msg[d.msg.lastIndexOf("级")-1]
            var l2 = e.msg[e.msg.lastIndexOf("级")-1]
            return l1 != l2 && l2 - l1 || e.tampTime - e.tampTime
        }) 
        return o    
    },

    //编队检查
    _precheck(preset) {
        //单兵检查(含机甲)
        if (0 == preset || 9 == preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0]
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队
        if (0 < preset && preset < 9) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
            if (!march) return 0  
    
            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0
 
            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    async _equipHeroSkills(heroId, type) {
        var a = [[25235,25234,25035,25034], [25235,25233,25035,25033], [25235,25232,25035,25032], [25235,25236,25035,25036]][type-1]        
        for(var i = 0; i < 4; i++) {
            var hero = UserData.Heros[heroId], item = null, n = -1
            UserData._items.forEach(e=>parseInt(e.ItemId\/100) == a[i] && e.Amount>0 && (!item || item.ItemId < e.ItemId) && (item = e))
            if (hero && item) {
                if (hero.SecondSkillList.find(e=>e.skillId == item.Data.para1)) continue    //已安装
                if ((n = hero.SecondSkillList.findIndex(e=>e.skillId == 0)) < 0) break      //查找空槽
                await send(RequestId.STUDY_HERO_SKILL, {heroId:heroId, index:n, itemId:item.ItemId, isBuffSlot:!1, skillsIndex:2})
            }
        }
        UserData.Heros[heroId].SkillsIndex == 2 || await send(RequestId.ChangeHeroSkillsIndex, {heroId:heroId, skillsIndex:2})    //切到技能组2       
    },

    async _removeHeroSkills(heroId) {
        var n = -1
        while ((n = UserData.Heros[heroId].SecondSkillList.findIndex(e=>[21205,21206,21204,21203,21202,20205,20206,20204,20203,20202].includes(e.skillId))) >= 0) {
            await send(RequestId.FORGET_HERO_SKILL, {heroId:heroId, index:n, isBuffSlot:!1, skillsIndex:2})
        }
        UserData.Heros[heroId].SkillsIndex == 1 || await send(RequestId.ChangeHeroSkillsIndex, {heroId:heroId, skillsIndex:1})    //切回技能组1      
    },

    async _equipSkills(preset, type) {
        var march = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
        if (march && type) {
            for (var i = 0; i < march.HeroIds.length; i++) await this._equipHeroSkills(march.HeroIds[i], type)
        }
    },

    async _removeSkills(preset) {
        var march = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
        if (march) {
            for (var i = 0; i < march.HeroIds.length; i++) await this._removeHeroSkills(march.HeroIds[i])
        }
    },

    async _getTileInfo(p) {
        var c = __require("NWorldMapController").default.instance
        var o = p && await send(RequestId.GET_WORLD_INFO, {x: p.x, y: p.y, k: UserData.ServerId, marchInfo: !1, viewLevel: 0})
        p = o && o.pointList && o.pointList.find(e=>e.x == p.x && e.y == p.y)
        return p && (c.updateTileInfo(p, 0), c.getTileInfoByCoord(p.x, p.y, p.k, 0))
    },

    async _getTowerInfo(ti) {
        return await send(RequestId.GET_TOWERINFO, {id: ti.extData.id})
    },

    async _marchTower(preset) {
        var context = helper.battle.backup()
        try {
            var c = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.MAP_BUILDING, this.tileInfo.extData.bid + "") 
            var o = Object.assign(new(__require("NWorldTowerPopup").default), {_tileInfo: this.tileInfo, _towerInfo: this.towerInfo, _cfg: c})
            o.AttackTowerinfo(__require("BattleData").BattleType.TOWER_COLLECT)  //采集机械田
            return helper.battle.setup(preset, c.force_capacity - this.towerInfo.army_size) && helper.battle.march()    //设置英雄和士兵并出征
        }
        finally {
            helper.battle.restore(context)
        }
    },

    async _gatherTower(preset) {
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                return await this._marchTower(preset)        //出征
            }
            finally {
                helper.battle.mutex.release()
            }
        }
    },

    //是否存在自己行军
    _existMyMarch(point) {
        for (var r in __require("NWorldMapMarchModel").default.instance.myMarch) {
            var o = __require("NWorldMapData").default.instance.marches[r];
            if (o && o.target_tx == point.x && o.target_ty == point.y) return !0
        }
        return !1
    },

    //机械田空间
    _towerCapacity(ti) {
        var o = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.MAP_BUILDING, ti.extData.bid + "")
        return o && o.force_capacity 
    },

    async _marchField(preset) {
        var context = helper.battle.backup()
        try {
            var o = Object.assign(new(__require("NWorldResourcePopup").default), {_tileInfo: this.tileInfo, _resInfo: this.resInfo})
            o.Attack()  // 普通采集
            return helper.battle.setup(preset, 9999) && helper.battle.march()  //设置英雄和士兵并出征
        }
        finally {
            helper.battle.restore(context)
        }
    },

    async _gatherField(preset) {
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                return await this._marchField(preset)        //出征
            }
            finally {
                helper.battle.mutex.release()
            }
        }
    },

    async _searchField(type) {
        for(var i = type == 4 ? 3: 5; i >= 1; i--) {
            var t  = [701, 501, 101, 1600][type-1]
            var o = await send(RequestId.WORLD_SEARCH_MONSTER, {groupType:t+i, maxLevel:i, minLevel:i, pointType:2})
            if (o && o.point && o.point.r) return o.point
        }
    },

    async _gatherWithSkills(preset, type, kind) {
        //切换超级矿工
        if (UserData.UsingCastleFace != 1710700 && UserData.MyCastleFace[1710700]) {
            await send(RequestId.USE_CASTLE_FACE, {skinId:1710700, special:0})
        } 
        
        //安装采集技能
        await this._equipSkills(preset, type)
        
        //采集行军出征
        switch (kind) {
            case 1: var o = await this._gatherTower(preset); break
            case 2: var o = await this._gatherField(preset); break
        }

        //恢复英雄技能
        await this._removeSkills(preset)
        return o
    },

    async _gather(preset, type, option) {
        //机械采集
        if (option == 1 || option == 3) {
            for(var e of this._records(type)) {
                var p = e.targetPosArr[0]
                if (!this._existMyMarch(p)) {
                    this.tileInfo = await this._getTileInfo(p)                //方格信息
                    this.towerInfo = await this._getTowerInfo(this.tileInfo)  //塔信息
                    var o = this._towerCapacity(this.tileInfo) - this.towerInfo.army_size >= 10 && await this._gatherWithSkills(preset, type, 1)
                    if (o) return o
                }
            }  
        }
        //普通采集
        if (option == 2 || option == 3) {
            var p = await this._searchField(type)
            if(p) {
                this.tileInfo = await this._getTileInfo(p)
                this.resInfo = __require("NWorldMapModel").default.instance.getResourceInfoByTileId(this.tileInfo.id)
                var o = await this._gatherWithSkills(preset, type, 2)
                return o
            }
        }
    },

    async _execute() {
        //var cur_skin = UserData.UsingCastleFace
        for(var i = 0; i < this.setting.length; i++) {
            var s = this.setting[i]
            if (s.selected && s.type && s.option && (UserData.myMarchNum < UserData.myMarchNumMAX) && this._precheck(i+1)) {           
                var o = await this._gather(i+1, s.type, s.option)
                o && o.marchInfo || sleep(5000)
            }
        }
        //恢复当前皮肤  -- 不能立即恢复当前皮肤，因为矿工增益在下田时点生效（不是在出征时点）
        //(UserData.UsingCastleFace != cur_skin) && await send(RequestId.USE_CASTLE_FACE, {skinId:cur_skin, special:0})
    },

    async _onTimer() {
        if (!this.busy) {
            try {this.busy = 1, await this._execute()} finally{this.busy = 0}
        }
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("gather-resource", JSON.stringify({setting:this.setting, state:this.state}))
    },

    async _load() {
        var o = await getItem("gather-resource")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state.running = o.state.running)
    },

    _render() {
        var iframe = helper.dialog.iframe
        iframe && iframe.contentWindow.render(this.setting, this.state)        
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },

    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },

    apply(setting) {
        for (var i=0; i<8; ++i) {    
            this.setting[i].selected = setting[i].selected
            this.setting[i].type = setting[i].type
            this.setting[i].option = setting[i].option
        }
        this._update()
    },

    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"gather-resource", width:535, height:315, html:this.html})
        this._render()
    }
}

helper.pro.gatherResource.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:26px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:6px; width:14px; height:14px;}
    input[type="radio"]{margin-right:1px; vertical-align:top; margin-top:6px; margin-left:12px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;} div span{margin-left:12px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:8px; padding-right:0px; box-shadow: 3px 3px 6px gray;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:160px; margin-top:8px; text-align:center; width:80px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function apply() {
        var setting = []
        for (var i=0; i<8; ++i) {
            var selected = !1, type = 0, option = 0
            selected = $("#team-"+(i+1)).children[0].checked
            type = selected && Number($("#team-"+(i+1)).children[2].children[1].value)
            option = selected && (
                $("#team-"+(i+1)).children[2].children[2].checked && 1 ||
                $("#team-"+(i+1)).children[2].children[3].checked && 2 ||
                $("#team-"+(i+1)).children[2].children[4].checked && 3
            )
            setting.push({selected: selected, type: type, option: option})
        }
        parent.helper.pro.gatherResource.apply(setting);
    }

    function render(setting, state) {
        var html=""
        for(var i=0; i<8; ++i) {
            $("#team-"+(i+1)).children[0].checked = setting[i].selected
            $("#team-"+(i+1)).children[2].style.display = setting[i].selected? "inline-block" : "none"
            $("#team-"+(i+1)).children[2].children[1].value = setting[i].type
            $("#team-"+(i+1)).children[2].children[2].checked = setting[i].option==1
            $("#team-"+(i+1)).children[2].children[3].checked = setting[i].option==2
            $("#team-"+(i+1)).children[2].children[4].checked = setting[i].option==3
        }

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动";
    }

    function action() {
        var o = parent.helper.pro.gatherResource
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>自动采集资源<\/h3>
    <div class="panel">
        <div id="team-1">
            <input type="checkbox" onclick="apply()"><label>编队1<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-1" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-1" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-1" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-2">
            <input type="checkbox" onclick="apply()"><label>编队2<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-2" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-2" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-2" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-3">
            <input type="checkbox" onclick="apply()"><label>编队3<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-3" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-3" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-3" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-4">
            <input type="checkbox" onclick="apply()"><label>编队4<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-4" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-4" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-4" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-5">
            <input type="checkbox" onclick="apply()"><label>编队5<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-5" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-5" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-5" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-6">
            <input type="checkbox" onclick="apply()"><label>编队6<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-6" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-6" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-6" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-7">
            <input type="checkbox" onclick="apply()"><label>编队7<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-7" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-7" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-7" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
        <div id="team-8">
            <input type="checkbox" onclick="apply()"><label>编队8<\/label>
            <div style="display:inline-block">
                <span>资源类型:<\/span>
                <select value="1" onchange="apply()">
                    <option value="1">农田<\/option>
                    <option value="2">油田<\/option>
                    <option value="3">金矿<\/option>
                    <option value="4">雷神矿<\/option>
                <\/select>
                <input type="radio" name="option-8" onclick="apply()">仅机械田<\/input>
                <input type="radio" name="option-8" onclick="apply()">仅普通田<\/input>
                <input type="radio" name="option-8" onclick="apply()">优先机械田<\/input>
            <\/div>
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//捐打联盟机甲
helper.pro.allianceMecha && helper.pro.allianceMecha.free()
helper.pro.allianceMecha = {
    setting:{donate:!0, amount:1, attack:!0, preset:0, precheck:!0, energy:!0},
    state:{running:!1},

    async _fight(ti) {
        if (await helper.battle.mutex.acquire(2000) ) {
            try {
                var context = helper.battle.backup()
                var o = new(__require("WorldBossDetailPanel").default)
                Object.assign(o, {tileInfo:ti, bossId:ti.extData.bossId}).onClickAttackBtn()
                return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()            //设置英雄和士兵并出征
             }
            finally {
                helper.battle.restore(context);
                helper.battle.mutex.release();
            }
        }
    },

    async _tileInfo(p) {
        var c = __require("NWorldMapController").default.instance
        var o = p && await send(RequestId.GET_WORLD_INFO, {x: p.x, y: p.y, k: UserData.ServerId, marchInfo: !1, viewLevel: 0})
        p = o && o.pointList && o.pointList.find(e=>e.x == p.x && e.y == p.y)
        return p && (c.updateTileInfo(p, 0), c.getTileInfoByCoord(p.x, p.y, p.k, 0))
    },

    //补充体力
   _charge() {
    if (this.setting.energy) {
        for(var e of UserData.getItemList()) {
            if (6 === e.Data.type && e.Amount > 0) {
                    return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId});
                }
            }
        }
        return 0
    },

    //体力检查  
    async _energy(ti) {
        //计算任务体力
        var y = __require("TableManager").TABLE.getTableDataById("monster_group", ti.extData.bossId.toString())
        var t = __require("FWSTool").Obj.getPropertyByNames(y, 0, "cost_energy")
        var s = UserData.getEnergy(1).Point
        return (t <= s ? 1 : await this._charge() ? 2 : 0)
    },

    //检查编队
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队检查
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            var armys = __require("GameTools").default.getAttackerMyArmys()
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  

            //检查英雄
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0

            //检查士兵
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    async _attack(boss) {
        if (UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck()) {
            var o = await send(RequestId.ALLIANCE_GET_MEMBER_RANK_LIST, {allianceId: UserData.Alliance.Aid, start: 0, end: 30, type: 11})  //伤害
            if (o && !o.myRank) {
                var ti = await this._tileInfo({x:boss.x, y:boss.y})
                ti && await this._energy(ti) && await this._fight(ti)
            }
        } 
    },

    async _donate(boss, today) {
        var TABLE = __require("TableManager").TABLE
        var TableName = __require("TableName").TableName
        var GameTools = __require("GameTools").default

        //获取已捐数量,计算待捐数量
        var n = this.setting.amount
        var o = await send(RequestId.ALLIANCE_GET_MEMBER_RANK_LIST, {allianceId: UserData.Alliance.Aid, start: 0, end: 30, type: 10})  //捐献
        o && o.myRank && (n = n - Math.floor(o.myRank.power)) 
        
        //免费捐献
        if (n > 0 && today.free) {
            o = await send(RequestId.ALLIANCE_BOSS_DONATE, {count: 0})
            o && (n = n - o.count)
        }

        //计算可捐数量
        o = TABLE.getTableDataById(TableName.Alliance_Boss, boss.bossId.toString())
        n = Math.min(n, o.num - boss.exp)
        n = Math.min(n, Number(GameTools.getDataConfigData(25008)) - today.time)
        n = Math.min(n, UserData.getItemAmount(3200001))

        //捐献
        n > 0 && await send(RequestId.ALLIANCE_BOSS_DONATE, {count: n})
    },

    async _execute() {
        if (UserData.Alliance.JoinTime + parseInt(__require("GameTools").default.getDataConfigData(25009)) <= ServerTime) {
            var o = await send(RequestId.ALLIANCE_BOSS_GET_INFO, {})
            o && o.allianceBoss && (
                this.setting.donate && 0 == o.allianceBoss.state && await this._donate(o.allianceBoss, {free:o.todayFree, time:o.todayTime}),
                this.setting.attack && (1 == o.allianceBoss.state || 4 == o.allianceBoss.state) && await this._attack(o.allianceBoss)
            )
        }
    },

    _onTimer() {
        this._execute()
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 180000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("alliance-mecha", JSON.stringify({setting:this.setting, state:this.state}))        
    },

    async _load() {
        var o = await getItem("alliance-mecha")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "alliance-mecha") {
            iframe.contentWindow.render(this.setting, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(setting) {
        this.setting = setting
        this._update()
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"alliance-mecha", width:480, height:175, html:this.html})
        this._render() 
    }
}

helper.pro.allianceMecha.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.counter{margin-left:4px; width:100%;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; margin-left:123px; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:140px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-top:8px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function editchange(edit) {
        edit.setAttribute("value", Number(edit.value.replace('个',''))); 
        apply();   
    }

    function listchange(list) {
        var edit = list.parentNode.children["edit"];
        var i = list.selectedIndex;
        edit.value = list.options[i].innerText;
        edit.setAttribute("value", list.options[i].value);
        list.selectedIndex = 0;
        apply();
    }

    function apply() {
        var setting = {}
        setting.donate = $("#donate").checked
        setting.amount = Number($("#amount").children["edit"].getAttribute("value"))
        setting.attack = $("#attack").checked
        setting.preset = Number($("#preset").value)
        setting.precheck = $("#precheck").checked
        setting.energy = $("#energy").checked
        parent.helper.pro.allianceMecha.apply(setting)
    }

    function render(setting, state) {
        $("#donate").checked = setting.donate
        $("#amount").children["edit"].value = setting.amount + '个'
        $("#amount").children["edit"].setAttribute("value", setting.amount)

        $("#attack").checked = setting.attack
        $("#preset").value = setting.preset
        $("#precheck").checked = setting.precheck
        $("#energy").checked = setting.energy

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.allianceMecha
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>捐打联盟机甲<\/h3>
    <div class="panel">
        <div>
            <input type="checkbox" id="donate" onclick="apply()"><label class="label-text">捐献碎片<\/label>
            <span><\/span>
            <label>数量:<\/label>
            <div id="amount" class="combo-box">
                <select name="list" class="combo-list" onchange="listchange(this)">
                    <option style="display:none"><\/option>
                    <option value="1">1个<\/option>
                    <option value="2">2个<\/option>
                    <option value="3">3个<\/option>
                <\/select>
                <input name="edit" class="combo-edit" onchange="editchange(this)">
            <\/div>
        <\/div>
        <div>
            <input type="checkbox" id="attack" onclick="apply()"><label class="label-text">攻击机甲<\/label>
            <span><\/span>
            <label>编队:<\/label>
            <select class="combo-list" id="preset" onchange="apply()">
                <option value="0">单兵<\/option>
                <option value="1">编队1<\/option>
                <option value="2">编队2<\/option>
                <option value="3">编队3<\/option>
                <option value="4">编队4<\/option>
                <option value="5">编队5<\/option>
                <option value="6">编队6<\/option>
                <option value="7">编队7<\/option>
                <option value="8">编队8<\/option>
                <option value="9">自动<\/option>
            <\/select>
            <span><\/span>
            <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
            <span><\/span>
            <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//代领遗迹道具
helper.pro.fortressItem && helper.pro.fortressItem.free()
helper.pro.fortressItem = {
    setting: {
        group:{
            1: [8301701, 8301702, 8301703, 8301704, 8301705, 8301706], 
            2: [8301707, 8301708, 8301709, 8301710, 8301711, 8301712], 
            3: [8301721, 8301713, 8301714, 8301715, 8301716, 8301717, 8301718, 8301719, 8301720],
            4: [8301730, 8301722, 8301723, 8301724, 8301725, 8301726, 8301727, 8301728, 8301729, 8301731],
            5: [8301740, 8301732, 8301733, 8301734, 8301735, 8301736, 8301737, 8301738, 8301739, 8301741, 8301742, 8301743, 8301744],
            6: [8301753, 8301745, 8301746, 8301747, 8301748, 8301749, 8301750, 8301751, 8301752, 8301754, 8301755, 8301756, 8301757]
        }
    },
    state: {
        running: !1
    },
    history: [],
    
    _log(id) {
        this.history.splice(0, this.history.length-29)
        this.history.push({time: ServerTime, id: id})
        this._update()    
    },

    _iname(id) {
        var RewardController = __require("RewardController").RewardController
        var LocalManager = __require("LocalManager")
        
        var a = RewardController.Instance.getRewardsArrById(Number(id))
        return a && a[0] ? a[0].count +'个'+ LocalManager.LOCAL.getText(a[0].name) : ''
    },

    async _execute() {
        var TABLE = __require("TableManager").TABLE
        var TableName = __require("TableName").TableName

        var a = UserData.getCurServerWorldSiteList()
        for(var r in a) {
            if (4 == a[r].DistrictData.function && 2 == a[r].State && UserData.Alliance.Aid == a[r]._trueOwnerAid) {
                //道具遗迹编号
                var wonderId = a[r].DistrictData.id

                //获取遗迹道具列表
                var o = await send(RequestId.GET_FORTRESS_CHOOSE_ITEM_REWARD_DATA, {wonderId: wonderId})

                //入盟时间满足要求(3小时）且有领取次数
                var d = o && TABLE.getTableDataById(TableName.sp_fortress_item, String(o.id))
                var items = this.setting.group[o.id]
                if (o && d && ServerTime - o.joinTime > d.join_time && d.choose_num - o.have.length > 0) {
                    //领取道具索引
                    var index = -1
                    for (var m = 65535, i = 0; i<o.select.length; i++) {
                        //第一次出现则插入设置项（最低优先级）
                        var n = items.findIndex(id=>id == o.select[i])
                        n < 0 && (n = items.push(o.select[i]) - 1, this._update())
                        m > n && (m = n, index = i)
                    }

                    //领取遗迹道具
                    var id = o.select[index] 
                    o = await send(RequestId.FORTRESS_CHOOSE_ITEM_REWARD, {wonderId: wonderId, index: index})
                    o && o.reward && this._log(id)
                }
            }
        }
    },

    _onTimer() {
        this._execute()
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 180000))
    },
    
    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },
        
    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("fortress-item", JSON.stringify({setting:this.setting, state:this.state, history:this.history}))
    },

    async _load() {
        var o = await getItem("fortress-item")
        o && (o = JSON.parse(o)) && (this.setting =o.setting, this.state = o.state, this.history = o.history)
    },

    _render() {
        function timestr(t) {var a=new Date(t*1000); return (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}
        function logstr(e) {return timestr(e.time) + '  领取' + this._iname(e.id)}
   
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "fortress-item") {
            var group = {}
            for (var i in this.setting.group) {
                var items = []
                this.setting.group[i].forEach(e=>items.push({id:e, name:this._iname(e)}))
                group[i] = items
            }
            var history = []
            for (var i = this.history.length-1; i >= 0; i--) history.push(logstr.call(this, this.history[i]))
            iframe.contentWindow.render(group, history, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
     stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(i,items) {
        this.setting.group[i] = items
        this._save()
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    dayInit() {
        this.state.counter = [], this._update()
    },

    open() {
        helper.dialog.open({name:"fortress-item", width:560, height:415, html:this.html})
        this._render()
    }
}

helper.pro.fortressItem.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:0px; padding-right:0px; box-shadow: 3px 3px 6px gray;}
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    ul{display: flex; margin:4px; list-style-type: none; flex-flow: wrap; padding-inline-start: 0px;}
    li{margin:4px; margin-left:8px; padding-left:4px; text-align: left; width: 150px; height: 26px; background: #ddd; border-radius:2px;}
    .list .moving{background: transparent; color: transparent; border: 1px dashed #ddd;}  
    #group{color:#333;border:1px solid #ccc; border-radius:3px; outline-style:none; margin-left:12px; margin-top:6px; width:500px;}
    #content{height:180px; margin-top:4px; padding-left:4px; overflow-x:hide; overflow-y:auto;}
    #history{height:75px; line-height:25px; padding-left:4px; overflow-x:hide; overflow-y:auto;} 
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:175px; margin-top:8px; text-align:center; width:80px;}
<\/style>
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function changegroup() {
        parent.helper.pro.fortressItem._render()        
    }

    function apply() {
        var i = $("#group").value, items = []
        for(var li of $("#items").children) items.push(li.value)
        parent.helper.pro.fortressItem.apply(i, items)
    }

    function render(group, history, state) {
        $("#items").innerHTML = ""
        var i = $("#group").value
        for(var e of group[i]) {
            var li = document.createElement('li')
            li.draggable= !0
            li.value = e.id
            li.innerText = e.name

            $("#items").appendChild(li)
        }

        var html = ""
        history.forEach(e=>html += "" == html ? e : "<br>"+e)
        $("#history").innerHTML = html

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.fortressItem
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>领取遗迹道具<\/h3>
    <div class="panel">
        <select id="group" onchange="changegroup()">
            <option value=1>要塞等级1<\/option>
            <option value=2>要塞等级2<\/option>
            <option value=3>要塞等级3<\/option>
            <option value=4>要塞等级4<\/option>
            <option value=5>要塞等级5<\/option>
            <option value=6>要塞等级6<\/option>
        <\/select>
        <div id="content">
            <ul class="list" id="items">
                <li draggable="true">1<\/li>
                <li draggable="true">2<\/li>
                <li draggable="true">3<\/li>
                <li draggable="true">4<\/li>
                <li draggable="true">5<\/li>
            <\/ul>
        <\/div> 
    <\/div>
    <div class="panel">
        <div id="history">
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>

<script>
    let list = document.querySelector('.list')
    let currentLi
    list.addEventListener('dragstart',(e)=>{
        e.dataTransfer.effectAllowed = 'move'
        currentLi = e.target
        setTimeout(()=>{
            currentLi.classList.add('moving')
        })
    })

    list.addEventListener('dragenter',(e)=>{
        e.preventDefault()
        if(e.target === currentLi||e.target === list){
            return
        }
        let liArray = Array.from(list.childNodes)
        let currentIndex = liArray.indexOf(currentLi)
        let targetindex = liArray.indexOf(e.target)

        if(currentIndex<targetindex){
 
            list.insertBefore(currentLi,e.target.nextElementSibling)
        }else{
  
            list.insertBefore(currentLi,e.target)
        }
    })
    list.addEventListener('dragover',(e)=>{
        e.preventDefault()
    })
    list.addEventListener('dragend',(e)=>{
        currentLi.classList.remove('moving')
        apply()
    })
<\/script>

<\/html>`


//-------------------------------------------------------------------------------------------------
//攻击战争之源
helper.pro.worldBoss && helper.pro.worldBoss.free()
helper.pro.worldBoss = {
    setting:{preset:1, count:5, precheck:!0, energy:!1},
    state:{counter:0, running:!1},

    async _fight(ti) {
        if (await helper.battle.mutex.acquire(2000) ) {
            try {
                var context = helper.battle.backup()
                var o = new(__require("WorldBossDetailPanel").default)
                Object.assign(o, {tileInfo:ti, bossId:ti.extData.bossId}).onClickAttackBtn()
                return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()            //设置英雄和士兵并出征
             }
            finally {
                helper.battle.restore(context);
                helper.battle.mutex.release();
            }
        }
    },

    async _tileInfo(p) {
        var c = __require("NWorldMapController").default.instance
        var o = p && await send(RequestId.GET_WORLD_INFO, {x: p.x, y: p.y, k: UserData.ServerId, marchInfo: !1, viewLevel: 0})
        p = o && o.pointList && o.pointList.find(e=>e.x == p.x && e.y == p.y)
        return p && (c.updateTileInfo(p, 0), c.getTileInfoByCoord(p.x, p.y, p.k, 0))
    },

    //补充体力
   _charge() {
    if (this.setting.energy) {
        for(var e of UserData.getItemList()) {
            if (6 === e.Data.type && e.Amount > 0) {
                    return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId});
                }
            }
        }
        return 0
    },

    //体力检查  
    async _energy(ti) {
        //计算任务体力
        var y = __require("TableManager").TABLE.getTableDataById("monster_group", ti.extData.bossId.toString())
        var t = __require("FWSTool").Obj.getPropertyByNames(y, 0, "cost_energy")
        var s = UserData.getEnergy(1).Point
        return (t <= s ? 1 : await this._charge() ? 2 : 0)
    },

    //检查编队
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队检查
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            var armys = __require("GameTools").default.getAttackerMyArmys()
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  

            //检查英雄
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0

            //检查士兵
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    async _attack(boss) {
        if (UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck()) {
            var o = await send(RequestId.GET_BOSS_ATTACK_INFO, {})
            if (o && o.worldBossAttackCount < 5) {
                var ti = await this._tileInfo({x:boss.x, y:boss.y})
                return ti && await this._energy(ti) && await this._fight(ti)
            }
        } 
    },

    async _execute() {
        if (this.state.counter < this.setting.count && UserData.FunctionOn(__require("GameDefine").FunctionKey.world_boss)) {
            var d = new Date(ServerTime*1000), h = d.getHours(), m = d.getMinutes(), w = d.getDay()
            if (h == 4 || h == 20 || (w > 0 && h == 12 || w == 0 && (h==12 && m>=5 || h==13 && m<5))) {
                var o = await send(RequestId.getBossInfo, {})
                o && o.bossId && await this._attack(o) && (this.state.counter++, this._update())
            }
        }
    },

    _onTimer() {
        this._execute()
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 10000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("world-boss", JSON.stringify({setting:this.setting, state:this.state}))        
    },

    async _load() {
        var o = await getItem("world-boss")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "world-boss") {
            iframe.contentWindow.render(this.setting, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(setting) {
        this.setting = setting
        this._update()
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    dayInit() {
        this.state.counter = 0, this._update()
    },

    open() {
        helper.dialog.open({name:"world-boss", width:500, height:175, html:this.html})
        this._render() 
    }
}

helper.pro.worldBoss.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    span{margin-left:12px}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; width:100%}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:140px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-top:8px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function apply() {
        var setting = {}
        setting.preset = Number($("#preset").value)
        setting.count = Number($("#count").value)
        setting.precheck = $("#precheck").checked
        setting.energy = $("#energy").checked
        parent.helper.pro.worldBoss.apply(setting)
    }

    function render(setting, state) {
        $("#preset").value = setting.preset
        $("#count").value = setting.count
        $("#precheck").checked = setting.precheck
        $("#energy").checked = setting.energy
        $("#counter").innerText = state.counter ? '已攻击' + state.counter +'次' : '　'
        $("#counter").style.color = state.counter >= setting.count ? "green" : state.running ? "purple" : "black"

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.worldBoss
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>攻击战争之源<\/h3>
    <div class="panel">
        <label>编队：<\/label>
        <select id="preset" class="combo-list" onchange="apply()">
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <span><\/span>
        <label>次数：<\/label>
        <select id="count" class="combo-list" onchange="apply()">
            <option value="1">1次<\/option>
            <option value="2">2次<\/option>
            <option value="3">3次<\/option>
            <option value="4">4次<\/option>
            <option value="5">5次<\/option>
        <\/select>
        <span><\/span>
        <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
        <span><\/span>
        <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <br>
        <label id="counter"><\/label>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//免受攻击保护
helper.pro.avoidAttacked && helper.pro.avoidAttacked.free()
helper.pro.avoidAttacked = {
    setting: {
        factor: {mecha: 2.0, power: 1.1, restraint: 2.0},
        option: {shield:!0, move_city:!0, assembly:!0},
        propitem: 0,
        block: 0,
        teams: 12345678
    },
    state: {
        running: !1
    },
    marchList: [],
    history: [],

    //---------------------------------------------------------------------------------------------
    // id: 0-自动选择, 200004-4小时护盾 200005-8小时护盾 200006-24小时护盾
    async _shieldProtect(id) {
        //存在护盾
        if (UserData.ShieldTime > ServerTime) return !0

        //战争状态
        var e = UserData.Buff.StatePool["41001"]
        if (e && e.EndTime > ServerTime) return !1

        //检查道具
        id || (id = UserData.getItemAmount(200004) ? 200004 : UserData.getItemAmount(200005) ? 200005 : 200006) 
        if (UserData.getItemAmount(id) == 0) return !1  

        //添加护盾
        return await send(RequestId.PeaceShieldHandler, {itemId:id, amount:1, isPurchase:0})    
    },

    //---------------------------------------------------------------------------------------------
    _randomBase(i) {
        if (i>=0 && i<=9) {
            // i=0表示全地图,随机选择一块区域
            i = i > 0 ? i-1 : Math.min(Math.floor(Math.random()*9), 8)

            //九块区域基准坐标
            var x = (i % 3) * 272 + 136
            var y = Math.floor(i \/ 3) * 317 + 158

            //基准偶数坐标
            y % 2 == 1 && y++
            return {x:x, y:y}
        }
    },

    _randomDest(e) {
        //随机同偶坐标，坐标范围x=base.x-36~base.x+36, y=base.y-36~base.y+36
        var x = Math.floor(e.x - 36 + Math.random()*72), y = Math.floor(e.y - 36 + Math.random()*72)
        x % 2 == 0 && y % 2 == 1 && y++
        x % 2 == 1 && y % 2 == 0 && y++
        return {x:x, y:y}        
    },

    _canMove(o, e) {
        //检查坐标是空地且不属于其他盟领地
        var u = __require("NWorldMapUtils").NWorldMapUtils
        var t = __require("NWorldMapTerritoryController").default.instance.getAllianceIdByPoint(e.x, e.y)
        return u.checkTileArea(e.x, e.y, UserData.ServerId, 0) && u.checkCanMove(e.x, e.y) && (t <= 0 || t == UserData.Alliance.Aid) && !o.pointList.find(i=>i.x == e.x && i.y == e.y) 
    },

    async _updateMap(b) {
        var a = __require("NWorldMapController").default.instance, y = __require("NWorldMapMarchController").default.instance
        var g = __require("NWorldMapTerritoryModel").default.instance, f = __require("NWorldMapData").default.instance, d = __require("WorldMapMsgs")    

        //更新坐标信息
        var k = UserData.ServerId, r = new Map, s 
        var o = await send(RequestId.GET_WORLD_INFO, {x: b.x, y: b.y, k: k, rid: 0, width: 14, height: 20, marchInfo: !0, viewLevel: 1})
        o && o.pointList && o.pointList.forEach(e=>s = a.updateTileInfo(e, 1), s && r.set(s, !0)) 
        d.send(d.Names.WorldMapUpdateViewPort, r)

        //更新行军信息
        o && o.marchList && (y.model.dealMarchDataFromNowWorldMarchData(o.marchList, !0), y.model.addMonsterDefenderMarchData())
        d.send(d.Names.WorldMapMarchsInit, null)

        //更新联盟领地
        var t = await send(RequestId.GET_TERRITORY_INFO, {x: b.x, y: b.y, k: k, width: 14, height: 20})
        t && t.infos && (g.clearAlianceTerritory(), g.updateAllianceTerritory(t.infos, !1, k))

        return o
    },

    async _randomTile(i) {
        var b = this._randomBase(i), o = await this._updateMap(b), e = this._randomDest(b), n = 0
        //最多尝试100次
        while (o && e && ++n <= 100) { 
            if (this._canMove(o, e) && this._canMove(o, {x:e.x, y:e.y-2}) && this._canMove(o, {x:e.x-1, y:e.y-1}) && this._canMove(o, {x:e.x+1, y:e.y-1})) return e
            e = this._randomDest(b) 
        }
    },

    async _moveProtect(i) {
        if (0 == UserData.myMarchNum && UserData.getItemAmount(200003)) {
            var e = await this._randomTile(i)

            \/*雷云技能,防守时不使用雷云技能
            var n = parseInt(__require("GameTools").default.getDataConfigData(20214233)) //1781000
            var o = n &&__require("GameTools").default.getCitySkillConfigDataBySkinId(n, 0)
            var r = n && UserData.getCitySkillDataById(n)
            e = o && r && o.times_perday > r.Count && {itemId:0, amount:0, isPurchase:0, x:e.x, y:e.y, citySkill:1}
            *\/

            //道具迁城
            var o = e && await send(RequestId.MOVE_CITY_POSITION, {itemId:200003, amount:1, isPurchase:0, x:e.x, y:e.y, citySkill:0})
            o ? __require("WorldMapMsgs").send(__require("WorldMapMsgs").Names.WorldMapUpdateViewPort, null) : console.log(e)
            return o
        }
    },

    //---------------------------------------------------------------------------------------------
    async _gather(ti, preset) {
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                var context = helper.battle.backup()
                var ri = __require("NWorldMapModel").default.instance.getResourceInfoByTileId(ti.id)
                Object.assign(new(__require("NWorldResourcePopup").default), {_tileInfo: ti, _resInfo: ri}).Attack()  // 采集
                return helper.battle.setup(preset, 9999) && helper.battle.march()  //设置英雄和士兵并出征
            }
            finally {
                helper.battle.restore(context)
                helper.battle.mutex.release()
            }
        }
    },

    async _tileInfo(p) {
        var c = __require("NWorldMapController").default.instance
        return p && (c.updateTileInfo(p, 0), c.getTileInfoByCoord(p.x, p.y, p.k, 0))
    },

    async _searchResource() {
        for(var i = 5; i >= 1; --i) {
            for(var t of [101, 501, 701]) {
                var o = await send(RequestId.WORLD_SEARCH_MONSTER, {groupType:t+i, maxLevel:i, minLevel:i, pointType:2})
                if (o && o.point && o.point.r) return o.point
            }
        }
    },

    async _gatherProtect(t) {
        var n = UserData.myMarchNumMAX - UserData.myMarchNum
        var s = t.toString(), r = !1
        for(var o, i = 0; i < n; ++i) {
            o = s[i] && await this._searchResource()
            o = o && this._tileInfo(o)
            r = o && await this._gather(o, Number(s[i])) || r
        }
        return r
    }, 

    //---------------------------------------------------------------------------------------------
    async _assembly(ti, preset) {
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                var context = helper.battle.backup()
                Object.assign(wmnew(__require("NWorldMapAssemblyEnemyComponent").default), {tileInfo:ti}).StartAssembly(null, 0)
                return helper.battle.setup(preset, 9999) && helper.battle.march()   
            }
            finally {
                helper.battle.restore(context)
                helper.battle.mutex.release()
            }
        }
    },

    //搜索战锤
    async _searchHammer() {

        var id = __require("WorldMonsterModel").WorldMonsterModel.Instance.assembleMonsterList[0].id
        var o = send(RequestId.WORLD_SEARCH_MONSTER, {groupType: id, pointType: 3, minLevel: 10, maxLevel: 80})
        return o && o.point
    },

    //补充体力
    async _charge() {
        if (UserData.getEnergy(1).Point < 10) {
            for(var e of UserData.getItemList()) if (6 === e.Data.type && e.Amount > 0) return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId})
            return !1
        }
        return !0
    },

    async _assemblyProtect(t) {
        var n = UserData.myMarchNumMAX - UserData.myMarchNum && await this._charge()
        var s = t.toString(), r = !1
        for(var o, i = 0; i < n; ++i) {
            o = s[i] && await _charge() && await this._searchHammer()
            o = o && this._tileInfo(o)
            o = o && await this._assembly(o, Number(s[i]))
            r = (o && this.marchList.push(o), this.marchList.length>8 && this.marchList.splice(0,1), o || r)
        }
        return r
    },

    //---------------------------------------------------------------------------------------------
    //防守三军兵力
    _defenderArmyPower() {
        var NBattleModel = __require("NBattleModel").NBattleModel
        var HeroController = __require("HeroController").HeroController
        var NBattlePositionBiz = __require("NBattlePositionBiz").NBattlePositionBiz
        var TableName = __require("TableName").TableName
        var TABLE = __require("TableManager").TABLE
        var GameTools = __require("GameTools")

        var heros = HeroController.getInstance().getHaveHeroCanMarchList()
          , armys = GameTools.default.getAttackerMyArmys()
          , total = {}

        //检查英雄
        NBattleModel.instance.attackerHeros = HeroController.getInstance().getProtectHeroListId()
        NBattleModel.instance.myMaxArmysNum = NBattlePositionBiz.getPositionCount(UserData.Level)
        for (var hero of NBattleModel.instance.attackerHeros) if (!heros.find(e=>e._id == hero)) return {1:0, 2:0, 3:0}

        //计算防守兵力
        armys.forEach(e=>{var n = e.ArmyData.id; total[n] = (total[n] ? total[n] : 0) + 1})
        for (var r = {}, p = {}, c, n, b, l, d, t, i = 0, a = UserData.DefenseArmyInfo; i < a.length; ++i) {
            c = r[a[i].armyId] ? r[a[i].armyId] : 0                   //已用士兵数
            n = NBattleModel.instance.getMaxCoutByPos(a[i].pos)       //最大士兵数
            b = total[a[i].armyId] - c                                //剩余士兵数
            l = n > b ? b : n                                         //实际士兵数
            d = TABLE.getTableDataById(TableName.ARMY, a[i].armyId)
            d && (
                d.mecha_id ? helper.battle.mechaOk(d.mecha_id) && (
                    t = d.type.toString().substring(0, 1),
                    p[t] = (p[t] ? p[t] : 0) + d.power * n * this.setting.factor.mecha
                ) : (
                    r[a[i].armyId] = c + l, 
                    t = a[i].armyId.toString().substring(0, 1),           //兵种
                    p[t] = (p[t] ? p[t] : 0) + d.power * l
                )
            ) 
        }
        \/* 由于攻击行军士兵明细不包含军阵附加士兵，暂时不考虑军阵附加兵力
        //军阵附加兵力
        if (UserData.DefenseExtraArmy) {
            i = UserData.DefenseExtraArmy.armyId                  //士兵Id
            n = UserData.DefenseExtraArmy.armyNum                 //最大士兵数
            c = r[i] ? r[i] : 0                                   //已用士兵数
            b = total[i] - c                                      //剩余士兵数
            l = n > b ? b : n                                     //实际士兵数
            d = TABLE.getTableDataById(TableName.ARMY, i)
            t = i.toString().substring(0, 1)
            p[t] = (p[t] ? p[t] : 0) + d.power * l
        }
        *\/
        return p
    },

    //进攻三军兵力
    _attackerArmyPower() {
        var TABLE = __require("TableManager").TABLE
        var TableName = __require("TableName").TableName

        //计算行军总兵力(包括集结)
        for(var p = {}, i = 0; i < this.attacker.list.length; ++i) {
            this.attacker.list[i].armys.forEach(e=>{
                var t, d = TABLE.getTableDataById(TableName.ARMY, e.armyId)
                d && (
                    d.mecha_id ? (
                        //机甲因子修正兵力
                        t = d.type.toString().substring(0, 1),                //t:兵种  1-陆军 2-海军 3-空军
                        p[t] = (p[t] ? p[t] : 0) + d.power * e.armyNum * this.setting.factor.mecha
                    ) : (
                        t = e.armyId.toString().substring(0, 1),           //兵种
                        p[t] = (p[t] ? p[t] : 0) + d.power * e.armyNum
                    )
                )  
            })
        }
        return p
    },

    //攻守三军兵力综合对比
    _compareArmyPower() {
        var r = (this.attacker.point.p.power && UserData.Power ? this.attacker.point.p.power \/ UserData.Power : 1) * this.setting.factor.power
        var t = this.setting.factor.restraint
        var k = this._attackerArmyPower()
        var n = this._defenderArmyPower()

        console.log("攻守三军兵力及战力系数:", k, n, r)

        //三军各自军力对比,加入战力比乘以战力因子后的四次方
        r = r * r * r * r
        n[1] = (n[1]?n[1]:0)-(k[1]?k[1]:0)*r
        n[2] = (n[2]?n[2]:0)-(k[2]?k[2]:0)*r
        n[3] = (n[3]?n[3]:0)-(k[3]?k[3]:0)*r

        console.log("战力修正后三军兵力差:", n)

        //综合三军战力对比,加入克制因子
        n[1]<0 && n[2]>0 && (n[1]+n[2]*t>=0 ? (n[2] += n[1]\/t, n[1] = 0) : (n[1] += n[2]*t, n[2] = 0))
        n[1]<0 && n[3]>0 && (n[1]+n[3]\/t>=0 ? (n[3] += n[1]*t, n[1] = 0) : (n[1] += n[3]\/t, n[3] = 0))

        n[2]<0 && n[3]>0 && (n[2]+n[3]*t>=0 ? (n[3] += n[2]\/t, n[2] = 0) : (n[2] += n[3]*t, n[3] = 0))
        n[2]<0 && n[1]>0 && (n[2]+n[1]\/t>=0 ? (n[1] += n[2]*t, n[2] = 0) : (n[2] += n[1]\/t, n[1] = 0))

        n[3]<0 && n[1]>0 && (n[3]+n[1]*t>=0 ? (n[1] += n[3]\/t, n[3] = 0) : (n[3] += n[1]*t, n[1] = 0))
        n[3]<0 && n[2]>0 && (n[3]+n[2]\/t>=0 ? (n[2] += n[3]*t, n[3] = 0) : (n[3] += n[2]\/t, n[2] = 0))

        console.log("克制修正后三军兵力差及总兵力差:", n, n[1] + n[2] + n[3])

        return n[1] + n[2] + n[3]
    },
    
    async _compare(marchId) {
        //获取攻击行军信息
        var o = marchId && await send(RequestId.GET_MARCH_INFO, {marchId:marchId})
        var march = o && o.marchInfo
           
        //获取攻击出征士兵明细
        o = march && await send(RequestId.MARCH_ARMY_DETAIL, {marchId:marchId})
        var list = o && o.list
            
        //获取攻击者基地信息(战力)
        o = march && await send(RequestId.GET_WORLD_INFO, {x:march.begin.bx, y:march.begin.by, k:UserData.ServerId, marchInfo:!1})
        var point = o && o.pointList.find(i=>i.x == march.begin.bx && i.y == march.begin.by)
                 
        //发起攻击行军状态
        this.attacker={march:march, list:list, point:point}
        return march && list && point && this._compareArmyPower()
    },

    async _protect() {
        if (!this.busy) try {
            this.busy = 1
            if (this.setting.option.shield && await this._shieldProtect(this.setting.propitem)) return 1
            if (this.setting.option.move_city && await this._moveProtect(this.setting.block)) return 2
            if (this.setting.option.assembly && await this._assemblyProtect(this.setting.teams)) return 3
            return 0
        } finally {
            this.busy = 0
        }
    },

    _log(e) {
        this.history.splice(0, this.history.length-29)
        this.history.push(e)
        this._update()    
    },    

    async onAttacking() {
        for(var i in UserData._AttackArmyPool) {
            var e = Object.assign({}, UserData._AttackArmyPool[i])
            
            //发起攻击行军状态
            if (1 == e.attackState) {
                var action = await this._compare(e.marchId) < 0 && await this._protect()
                var m = this.attacker.march
                m && this._log({time:ServerTime, uid:m.uid, name:m.name, type:1, x:m.begin.bx, y:m.begin.by, action:action, ext_data:this.attacker})
            }
        }
    },

    onApproaching(e) {
        console.log("攻击者抵近:", e)
        setTimeout(
            (async(e)=>{
                var action = await this._protect()
                //记录日志
                var o = e && e.p && JSON.parse(e.p.playerInfo)
                o && this._log({time:ServerTime, uid:e.p.pid, name:o.username, type:2, x:e.x, y:e.y, action:action, ext_data:{point:e}})
            }).bind(this), 
            1500, e
        )
    },

    onAssemblyUpdate(e) {
        if (this.marchList.find(k=>k.marchId == e.marchId)) {
            //踢人
        }
    },

    onMyMarchUpdate(e) {
        this.onAttacking()
    },
    
    _init_mc() {
        this.mc = new (__require("FWSMvc").FMessageConnectionAbstract)
        this.mc.updateTileInfo = async(e)=>{
            var o = await send(RequestId.GET_PLAYER_POINT, {targetId: UserData.UID.toString()})
            var t = o && o.point
            if (e && e.p && t && t.p && e.p.aid != t.p.aid && e.p.power >= t.p.power &&
                e.k == t.k && Math.pow(e.x-t.x, 2) + Math.pow(e.y-t.y, 2) <= 40) {
                this.onApproaching(e)
            }
        }
        this.mc.onFMessage_NEW_WORLD_MAP_CONTROLLER = e=>{var t = this.mc[e.data.name]; return t && (e.data.result = t.apply(this, e.data.args)), !0}
    },

    _onEvent() {
        __require("EventCenter").EVENT.on(__require("EventId").EventId.AttackingMarchUpdate, this.onAttacking, this)   //启动监听攻击事件
        __require("EventCenter").EVENT.on(__require("EventId").EventId.AssemblysUpdate, this.onAssemblyUpdate, this)   //监听集结修改事件
        __require("EventCenter").EVENT.on(__require("EventId").EventId.My_March_Update, this.onMyMarchUpdate, this)    //监听行军修改事件
    },

    _offEvent() {
        __require("EventCenter").EVENT.off(__require("EventId").EventId.AttackingMarchUpdate, this.onAttacking, this)   //停止监听攻击事件
        __require("EventCenter").EVENT.off(__require("EventId").EventId.AssemblysUpdate, this.onAssemblyUpdate, this)   //监听集结修改事件
        __require("EventCenter").EVENT.off(__require("EventId").EventId.My_March_Update, this.onMyMarchUpdate, this)    //监听行军修改事件
    },

    _start() {
        this._onEvent(), this.mc.connect() 
    },

    _stop() {
        this._offEvent(), this.mc.disconnect()
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        var a = []
        this.history.forEach(e => a.push({time:e.time, uid:e.uid, name:e.name, type:e.type, x:e.x, y:e.y, action:e.action}))
        setItem("avoid-attacked", JSON.stringify({setting:this.setting, state:this.state, history:a}))        
    },
 
    async _load() {
        var o = await getItem("avoid-attacked")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state, this.history = o.history)
    },
 
    _render() {
        function timestr(t) {var a=new Date(); return a.setTime(t*1000), (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}
 
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "avoid-attacked") {
            for (var history=[], i=this.history.length-1; i>=0; --i) {
                var e = this.history[i]
                if (1 == e.type) {
                    history.push(timestr(e.time) + '  ' + e.name + '(' + e.uid + ')从' + e.x + ',' + e.y + '攻击, ' + (e.action==0 ? '未启动保护' : e.action==1 ? '护盾保护' : e.action==2 ? '迁城保护' : '采集保护'))  
                } 
                if (2 == e.type) {
                    history.push(timestr(e.time) + '  ' + e.name + '(' + e.uid + ')抵近(' + e.x + ',' + e.y + '), ' + (e.action==0 ? '未启动保护' : e.action==1 ? '护盾保护' : e.action==2 ? '迁城保护' : '采集保护'))
                }
            }
            iframe.contentWindow.render(this.setting, history, this.state)
        }
    },
 
    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },

    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },

    apply(setting) {
        this.setting.option.shield = setting.option.shield
        this.setting.option.move_city = setting.option.move_city
        this.setting.option.assembly = setting.option.assembly
        this.setting.propitem = setting.propitem
        this.setting.block = setting.block
        this.setting.teams = setting.teams
        this._update()
    },

    async init() {
        this._init_mc(), await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"avoid-attacked", width:600, height:350, html:this.html})
        this._render() 
    }
}

helper.pro.avoidAttacked.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:26px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:6px; width:14px; height:14px;}
    select{border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    div.item{display:inline-block; margin-right:12px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding-left:12px; padding-right:0px; box-shadow: 3px 3px 6px gray;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:200px; margin-top:8px; text-align:center; width:80px;}
    #setting{padding-top:8px; padding-bottom:8px;} #assembly-div{margin-right:0px;} #teams{width:100px;}
    #history{height:200px; line-height:25px; padding-left:8px; overflow-x:auto; overflow-y:auto;} 
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function apply(e) {
        var setting = {option:{}}
        setting.option.shield = $("#shield").checked
        setting.option.move_city = $("#movecity").checked
        setting.option.assembly = $("#assembly").checked
        setting.propitem = Number($("#propitem").value)
        setting.block = Number($("#block").value)
        setting.teams = Number($("#teams").value)
        parent.helper.pro.avoidAttacked.apply(setting);
    }

    function render(setting, history, state) {
        $("#shield").checked = setting.option.shield
        $("#movecity").checked = setting.option.move_city 
        $("#assembly").checked = setting.option.assembly
        $("#propitem").value = setting.propitem
        $("#block").value = setting.block
        $("#teams").value = setting.teams

        $("#shield-div").style.visibility = setting.option.shield ? "visible" : "hidden"
        $("#movecity-div").style.visibility = setting.option.move_city ? "visible" : "hidden"
        $("#assembly-div").style.visibility = setting.option.assembly ? "visible" : "hidden"

        var html = ""
        history.forEach(e=>html += "" == html ? e : "<br>"+e)
        $("#history").innerHTML = html

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.avoidAttacked
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>免受攻击保护<\/h3>
    <div class="panel" id="setting">
        <input type="checkbox" id="shield" onclick="apply()"><label>护盾<\/label>
        <div class="item" id="shield-div">
            <label>道具:<\/label>
            <select id="propitem" name="propitem" onchange="apply()">
                <option value=0>自动<\/option>
                <option value=200004>4小时<\/option>
                <option value=200005>8小时<\/option>
                <option value=200006>24小时<\/option>
            <\/select>
        <\/div>
        <input type="checkbox" id="movecity" onclick="apply()"><label>迁城<\/label>
        <div class="item" id="movecity-div">
            <label>区域:<\/label>
            <select id="block" name="block" onchange="apply()">
                <option value=0>全地图<\/option>
                <option value=1>区域1<\/option>
                <option value=2>区域2<\/option>
                <option value=3>区域3<\/option>
                <option value=4>区域4<\/option>
                <option value=5>区域5<\/option>
                <option value=6>区域6<\/option>
                <option value=7>区域7<\/option>
                <option value=8>区域8<\/option>
                <option value=9>区域9<\/option>
            <\/select>
        <\/div>
        <input type="checkbox" id="assembly" onclick="apply()"><label>集结<\/label>
        <div class="item" id="assembly-div">
            <label>队列:<\/label>
            <input id="teams" placeholder="如123456" onchange="apply()">
        <\/div>
    <\/div>
    <div class="panel">
        <div id="history">
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//一键快速攻击
helper.pro.fastAttack && helper.pro.fastAttack.free()
helper.pro.fastAttack = {
    setting:{premove:!0, fixmove:!1, block:0, preset:1, precheck:!0, energy:!0},
    state:{running:!1},
    
    //攻击
    async _attack(t) {
        if (await helper.battle.mutex.acquire(2000) ) {
            try {
                var context = helper.battle.backup()
                t.AttackCityinfo(1)
                return helper.battle.setup(this.setting.preset, 9999) && helper.battle.march()            //设置英雄和士兵并出征
             }
            finally {
                helper.battle.restore(context);
                helper.battle.mutex.release();
            }
        }
    },

    //更新地图(基于P坐标)
    async _updateMap(p) {
        var a = __require("NWorldMapController").default.instance, y = __require("NWorldMapMarchController").default.instance
        var g = __require("NWorldMapTerritoryModel").default.instance, f = __require("NWorldMapData").default.instance, d = __require("WorldMapMsgs")    

        //更新坐标信息
        var k = UserData.ServerId, r = new Map, s 
        var o = await send(RequestId.GET_WORLD_INFO, {x: p.x, y: p.y, k: k, marchInfo: !0, viewLevel: 1})
        o && o.pointList && o.pointList.forEach(e=>s = a.updateTileInfo(e, 1), s && r.set(s, !0)) 
        d.send(d.Names.WorldMapUpdateViewPort, r)

        //更新行军信息
        o && o.marchList && (y.model.dealMarchDataFromNowWorldMarchData(o.marchList, !0), y.model.addMonsterDefenderMarchData())
        d.send(d.Names.WorldMapMarchsInit, null)

        //更新联盟领地
        var t = await send(RequestId.GET_TERRITORY_INFO, {x: p.x, y: p.y, k: k, width: 14, height: 20})
        t && t.infos && (g.clearAlianceTerritory(), g.updateAllianceTerritory(t.infos, !1, k))

        return o
    },

    //区域基准坐标
    _randomBase(i) {
        if (i>=0 && i<=9) {
            // i=0表示全地图,随机选择一块区域
            i = i > 0 ? i-1 : Math.min(Math.floor(Math.random()*9), 8)

            //九块区域基准坐标
            var x = (i % 3) * 272 + 136
            var y = Math.floor(i \/ 3) * 317 + 158

            //基准偶数坐标
            y % 2 == 1 && y++
            return {x:x, y:y}
        }
    },

    //区域随机坐标
    _randomDest(p) {
        //随机同偶坐标，坐标范围x=base.x-36~base.x+36, y=base.y-36~base.y+36
        var x = Math.floor(p.x - 36 + Math.random()*72), y = Math.floor(p.y - 36 + Math.random()*72)
        x % 2 == 0 && y % 2 == 1 && y++
        x % 2 == 1 && y % 2 == 0 && y++
        return {x:x, y:y}        
    },

    //检查可否迁城
    _canMove(o, e) {
        //检查坐标是空地且不属于其他盟领地
        var u = __require("NWorldMapUtils").NWorldMapUtils
        var t = __require("NWorldMapTerritoryController").default.instance.getAllianceIdByPoint(e.x, e.y)
        return u.checkTileArea(e.x, e.y, UserData.ServerId, 0) && u.checkCanMove(e.x, e.y) && (t <= 0 || t == UserData.Alliance.Aid) && !o.pointList.find(i=>i.x == e.x && i.y == e.y) 
    },

    //获取撤退坐标
    async _getRetreatPos() {
        var b = this._randomBase(this.setting.block), o = await this._updateMap(b), e = this._randomDest(b), n = 0
        //最多尝试100次
        while (o && e && ++n <= 100) { 
            if (this._canMove(o, e) && this._canMove(o, {x:e.x, y:e.y-2}) && this._canMove(o, {x:e.x-1, y:e.y-1}) && this._canMove(o, {x:e.x+1, y:e.y-1})) return e
            e = this._randomDest(b) 
        }
    },
 
    //获取攻击坐标
    _getAttackPos(p) {
        var u = __require("NWorldMapUtils").NWorldMapUtils

        //获取迁城坐标
        var x, y
        for (var dy = 0; dy < 3; dy++) {
            y = p.y + dy
            for (var dx = 0; dx < 3; dx++) {
                x = p.x + dx;
                (x + y) % 2 == 1 && y++
                if (u.checkCanMove(x, y)) return({x:x, y:y})

                x = p.x - dx;
                (x + y) % 2 == 1 && y++
                if (u.checkCanMove(x, y)) return({x:x, y:y})
            }

            y = p.y - dy
            for (var dx = 0; dx < 3; dx++) {
                x = p.x + dx;
                (x + y) % 2 == 1 && y++
                if (u.checkCanMove(x, y)) return({x:x, y:y})

                x = p.x - dx;
                (x + y) % 2 == 1 && y++
                if (u.checkCanMove(x, y)) return({x:x, y:y})
            }
        }
    },

    //执行迁城
    async _moveCity(p, b) {
        if (0 == UserData.myMarchNum) {
            //使用迁城道具
            var e = UserData.getItemAmount(200003) > 0 && {itemId:200003, amount:1, isPurchase:0, x:p.x, y:p.y, citySkill:0}

            //使用雷云技能
            if (b) {
                var GameTools = __require("GameTools").default
                var n = parseInt(GameTools.getDataConfigData(20214233)) //1781000
                var o = n && GameTools.getCitySkillConfigDataBySkinId(n, 0)
                var r = n && UserData.getCitySkillDataById(n)
                r && o.times_perday > r.Count && (e = {itemId:0, amount:0, isPurchase:0, x:p.x, y:p.y, citySkill:1})
            }
                
            //迁城
            var o = e && await send(RequestId.MOVE_CITY_POSITION, e)
            o  &&  __require("WorldMapMsgs").send(__require("WorldMapMsgs").Names.WorldMapUpdateViewPort, null)
            return o
        }
    },

    //补充体力
    _charge() {
        if (this.setting.energy) for(var e of UserData.getItemList()) {
            if (6 === e.Data.type && e.Amount > 0) return send(RequestId.ITEM_USE, {amount:1, itemid:e.ItemId})
        }
        return 0
    },
    
    //体力检查  
    async _energy() {
        //计算任务体力
        var t = UserData.getAttackCostEnergy(!1)
        var s = UserData.getEnergy(1).Point
        return (t <= s ? 1 : await this._charge() ? 2 : 0)
    },
    
    //检查编队
    _precheck() {
        //单兵检查(含机甲)
        if (0 == this.setting.preset || 9 == this.setting.preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队检查
        if (0 < this.setting.preset && this.setting.preset < 9 && this.setting.precheck) { 
            var march = UserData.PresetMarchData.getPreMarchByIndex(this.setting.preset-1)
            if (!march) return 0  
    
            //检查英雄
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return 0
    
            //检查士兵
            var armys = __require("GameTools").default.getAttackerMyArmys()
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return 0
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return 0
            }
        }
        return 1
    },

    //快速攻击入口
    async process(t) {
        function distance(a,b) {return Math.sqrt(Math.pow(a.x-b.x, 2)+Math.pow(a.y-b.y, 2))}

        if (!this.state.running) return  //未启用此功能

        //检查是否可攻击
        if (t && t.BtnLayout.getChildByName("BtnAttack").active && t.cityInfo.shieldTime < ServerTime &&
            UserData.myMarchNum < UserData.myMarchNumMAX && this._precheck() && await this._energy()) {
            //迁城
            var p = t.cityInfo
            if (this.setting.premove && distance(p, UserData.WorldCoord) > 5) {
                p = this._getAttackPos(p)
                p = p && await this._moveCity(p, !0)
            }
             
            //攻击
            var o = p && await this._attack(t) 
            o && (this.march = o.marchInfo, this.track = t.cityInfo.pid)
        }
    },

    //行军返回
    async _onback(marchId) {
        if (this.march && this.march.marchId == marchId) {
            //撤离
            if (this.setting.fixmove && 0 == UserData.myMarchNum) {
                var p = await this._getRetreatPos()
                p && await this._moveCity(p, !1)
            }
            this.march = null, this.track = null
        }
    },

    onMarchUpdate(e) {
        var o = JSON.parse(e);
        4 == o.marchInfo.state && this._onback(o.marchInfo.marchId);
    },

    async onUpdateTileInfo(e) {
        if (e.p && e.p.pid == this.track) {
            e.x == this.march.target.tx && e.y == this.march.target.ty || await send(RequestId.RECALL_MARCH, {marchId: this.march.marchId})
            __require("WorldMapTools").default.goToWorldMapByPos({x: e.x, y: e.y, s: e.k, subMap: 0})
        }
    },

    _start() {
        //捕捉行军信息
        __require("EventCenter").EVENT.on(__require("EventId").EventId.My_March_Update, this.onMarchUpdate, this)
        this.mc.connect() 
    },

    _stop() {
        //关闭行军信息
        __require("EventCenter").EVENT.off(__require("EventId").EventId.My_March_Update, this.onMarchUpdate, this)
        this.mc.disconnect() 
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("fast-attack", JSON.stringify({setting:this.setting, state:this.state}))
    },

    async _load() {
        var o = await getItem("fast-attack")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "fast-attack") {
            iframe.contentWindow.render(this.setting, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(setting) {
        this.setting = setting
        this._update()
    },    

    _init_mc() {
        this.mc = new (__require("FWSMvc").FMessageConnectionAbstract)
        this.mc.onFMessage_NEW_WORLD_MAP_CONTROLLER = e=>{var t = this.mc[e.data.name]; return t && (e.data.result = t.apply(this, e.data.args)), !0}
        this.mc.updateTileInfo = this.onUpdateTileInfo.bind(this)
    },

    _init_fn() {    
        var a = __require("NWorldCityPopup"), h = this
        a.default.prototype._onShow || (a.default.prototype._onShow = a.default.prototype.onShow)    
        a.default.prototype.onBtn_Track = function() {
            h.track != this.cityInfo.pid ? h.track = this.cityInfo.pid : h.track = null
            helper.closeUI("NWorldCityPopup")
        }
        a.default.prototype.onBtn_FastAttack = function() {
            h.process(this)
        }
        a.default.prototype.onShow = function(t) {
            this._onShow(t)
            if (this.BtnLayout.getChildByName("BtnAttack").active && h.state.running) {
                var clone = cc.instantiate(this.BtnLayout.getChildByName("BtnVisit"))
                this.BtnLayout.addChild(clone)
                clone.active = !0
                clone._name = "BtnTrack", 
                clone.getComponentInChildren(cc.Label)._string = this.cityInfo.pid != h.track ? "跟踪" : "停止跟踪"
                clone.getComponent(cc.Button).clickEvents[0].handler = 'onBtn_Track'
    
                clone = cc.instantiate(this.BtnLayout.getChildByName("BtnAttack"))
                this.BtnLayout.addChild(clone)
                clone._name = "BtnFastAttack"
                clone.getComponentInChildren(cc.Label)._string = "快速攻击"
                clone.getComponent(cc.Button).clickEvents[0].handler = "onBtn_FastAttack"
            }
        }
    },

    async init() {
        await this._load()
        this._init_mc(), this._init_fn()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"fast-attack", width:700, height:175, html:this.html})
        this._render() 
    }
}

helper.pro.fastAttack.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    span{margin-left:10px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:240px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-top:8px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function apply() {
        var setting = {}
        setting.premove = $("#premove").checked
        setting.fixmove = $("#fixmove").checked
        setting.block = Number($("#block").value)
        setting.preset = Number($("#preset").value)
        setting.precheck = $("#precheck").checked
        setting.energy = $("#energy").checked
        parent.helper.pro.fastAttack.apply(setting)
    }

    function render(setting, state) {
        $("#premove").checked = setting.premove
        $("#fixmove").checked = setting.fixmove
        $("#block").value = setting.block
        $("#preset").value = setting.preset
        $("#precheck").checked = setting.precheck
        $("#energy").checked = setting.energy

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.fastAttack
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>一键快速攻击<\/h3>
    <div class="panel">
        <input type="checkbox" id="premove" onclick="apply()"><label>攻击前迁城<\/label>
        <span><\/span>
        <input type="checkbox" id="fixmove" onclick="apply()"><label>攻击后迁城<\/label>
        <span><\/span>
        <label>区域:<\/label>
        <select id="block" name="block" onchange="apply()">
            <option value=0>全地图<\/option>
            <option value=1>区域1<\/option>
            <option value=2>区域2<\/option>
            <option value=3>区域3<\/option>
            <option value=4>区域4<\/option>
            <option value=5>区域5<\/option>
            <option value=6>区域6<\/option>
            <option value=7>区域7<\/option>
            <option value=8>区域8<\/option>
            <option value=9>区域9<\/option>
        <\/select>
        <span><\/span>
        <label>编队:<\/label>
        <select class="combo-list" id="preset" onchange="apply()">
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
        <\/select>
        <span><\/span>
        <input type="checkbox" id="precheck" onclick="apply()"><label>检查行军<\/label>
        <span><\/span>
        <input type="checkbox" id="energy" onclick="apply()"><label>补充体力<\/label>
        <br>
        <label style="color:purple;">激活此功能后，在点击对方城市弹出窗口界面点击"快速攻击"按钮可自动发起攻击<\/label>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`

//-------------------------------------------------------------------------------------------------
//宝藏商店道具
helper.pro.treasureShop && helper.pro.treasureShop.free()
helper.pro.treasureShop = {
    setting: { 
        items:[
            {id: 10171, selected: !1},   //职业道具自选宝箱(200)
            {id: 10172, selected: !1},   //职业道具自选宝箱(100)
            {id: 10173, selected: !1},   //橙色万能碎片(300)
            {id: 10174, selected: !1},   //橙色万能碎片(150) 
            {id: 10175, selected: !1},   //紫色万能碎片(60)
            {id: 10176, selected: !1},   //紫色万能碎片(30) 
            {id: 10177, selected: !1},   //陆军英雄专属技能宝箱(140)
            {id: 10178, selected: !1},   //海军英雄专属技能宝箱(140)
            {id: 10179, selected: !1},   //空军英雄专属技能宝箱(140)
            {id: 10180, selected: !1},   //陆军英雄专属技能宝箱(70) 
            {id: 10181, selected: !1},   //海军英雄专属技能宝箱(70) 
            {id: 10182, selected: !1},   //空军英雄专属技能宝箱(70) 
            {id: 10183, selected: !1},   //橙色经验书(90) 
            {id: 10184, selected: !1},   //橙色经验书(45) 
            {id: 10185, selected: !1},   //紫色经验书(30) 
            {id: 10186, selected: !1},   //紫色经验书(15) 
            {id: 10187, selected: !1},   //训练加速1小时(15) 
            {id: 10188, selected: !1},   //职业天赋加速8小时(120)
            {id: 10189, selected: !1},   //金币砰砰宝箱(60)
            {id: 10190, selected: !1},   //科技道具自选箱(20)
            {id: 10191, selected: !1},   //石油50K(50)
            {id: 10192, selected: !1},   //粮食50K(50)
            {id: 10193, selected: !1},   //高级招募券(75)
            {id: 10194, selected: !1},   //精英抽卡券(20)
            {id: 10195, selected: !1},   //护盾24小时(100) 
            {id: 10196, selected: !1},   //迁城(75)
            {id: 10197, selected: !1},   //中级装饰箱(25)
            {id: 10198, selected: !1},   //高级装饰箱(250) 
            {id: 10199, selected: !1},   //泰温碎片(200)
            {id: 10200, selected: !1},   //萨姆碎片(200)
            {id: 10201, selected: !1},   //希度碎片(200)
            {id: 10202, selected: !1},   //梅莉达碎片(200) 
            {id: 10203, selected: !1},   //克洛伊碎片(200) 
            {id: 10204, selected: !1},   //娜蒂娅碎片(200) 
            {id: 10205, selected: !1},   //爱德华碎片(200) 
            {id: 10206, selected: !1},   //齐扎阁夫人碎片(200)
            {id: 10207, selected: !1},   //李红玉碎片(200) 
            {id: 10208, selected: !1},   //天牧碎片(200)
            {id: 10209, selected: !1},   //泰蕾莎碎片(200) 
            {id: 10210, selected: !1},   //索维吉碎片(200) 
            {id: 10211, selected: !1},   //泰温碎片(100)
            {id: 10212, selected: !1},   //萨姆碎片(100)
            {id: 10213, selected: !1},   //希度碎片(100)
            {id: 10214, selected: !1},   //梅莉达碎片(100) 
            {id: 10215, selected: !1},   //克洛伊碎片(100) 
            {id: 10216, selected: !1},   //娜蒂娅碎片(100) 
            {id: 10217, selected: !1},   //爱德华碎片(100) 
            {id: 10218, selected: !1},   //齐扎阁夫人碎片(100) 
            {id: 10219, selected: !1},   //李红玉碎片(100) 
            {id: 10220, selected: !1},   //天牧碎片(100)
            {id: 10221, selected: !1},   //泰蕾莎碎片(100) 
            {id: 10222, selected: !1},   //索维吉碎片(100) 
            {id: 10223, selected: !1},   //李艺媛碎片(200) 
            {id: 10224, selected: !1},   //弗里德曼·赫兹碎片(200)
            {id: 10225, selected: !1},   //李艺媛碎片(100)
            {id: 10226, selected: !1}    //弗里德曼·赫兹碎片(100)
        ]
    },
    state: {
        counter: [], 
        lastid: "0",
        running: !1
    },
    history: [],

    _price(id) {
        var o = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.TREASURE_SHOP, id.toString())
        return o && o.price_shop
    },

    _iname(id) {
        var a = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.TREASURE_SHOP, id.toString())
        , l = a && __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.ITEM, a.item_id.toString())
        return l && __require("LocalManager").LOCAL.getText(l.name.toString())
    },

    _discount(id) {
        var o = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.TREASURE_SHOP, id.toString())
        return o && o.cut_off
    },

    _log(id) {
        this.history.splice(0, this.history.length-29)
        this.history.push({time: ServerTime, id: id})
        this._update()    
    },

    async _execute() {
        //获取最新宝藏商店
        var o = await send(RequestId.GET_TREASURE_MAP_DATA_BY_TYPE, {type:3, prePageLastId:this.state.lastid})
        if (o && o.lastOtherDataId && o.otherDataList) {
            this.state.lastid = o.lastOtherDataId
            for (var shop of o.otherDataList) {
                //获取宝藏道具
                var a = await send(RequestId.GET_TREASURE_MAP_WORLD_SHOP, {id:shop.id})
                a && a.data && (a = JSON.parse(a.data)) 
                for(var e of a.items) {
                    //第一次出现则插入设置表（默认未选中）
                    var s = this.setting.items.find(i=>i.id == e.shopId)
                    s || this.setting.items.push(s = {id:e.shopId, selected:!1})

                    //获取道具价格 
                    if (s.selected && e.num>0 && UserData.Resource.Gold >= this._price(e.shopId)) {
                        //购买宝藏道具
                        var o = await send(RequestId.BUY_IN_TREASURE_MAP_WORLD_SHOP, {shopId:e.shopId, amount:1, id:shop.id, num:1})
                        o && o.reward && (
                            s = this.state.counter.find(i=>i.id == e.shopId),
                            s || this.state.counter.push(s = {id:e.shopId, count:0}),  //插入
                            s.count++, this._log(e.shopId)
                        )
                    }
                }
            }
            this._update()
        }
    },

    _onTimer() {
        this._execute()
    },

    _start() {
        var interval = 837981059306 === UserData.UID ? 10000 : 30000
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), interval))
    },
    
    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },
        
    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("treasure-shop", JSON.stringify({setting:this.setting, state:this.state, history:this.history}))
    },

    async _load() {
        var o = await getItem("treasure-shop")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state.running = o.state.running, this.history = o.history)
    },

    _render() {
        function timestr(t) {var a=new Date(t*1000); return (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}
        function logstr(e) {return timestr(e.time) + '  消费' + this._price(e.id) + '钻石，购入' + this._iname(e.id)}
   
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "treasure-shop") {
            var items = [], history = []
            this.setting.items.forEach(e=>items.push({id:e.id, selected:e.selected, name:this._iname(e.id), price:this._price(e.id), discount:this._discount(e.id)}))
            items.sort((a,b)=>{return this._price(a.id) == this._price(b.id) ? a.id-b.id : this._price(a.id) - this._price(b.id)})
            for (var i=this.history.length-1; i>=0; --i) history.push(logstr.call(this, this.history[i]))
            iframe.contentWindow.render(items, history, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this.state.lastid="0", this._start(), this._update())
    },
     
     stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(items) {
        for (var a of items) this.setting.items.find(e=>e.id == a.id && (e.selected = a.selected, !0))
        this._save()
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    dayInit() {
        this.state.counter = [], this._update()
    },

    open() {
        helper.dialog.open({name:"treasure-shop", width:570, height:440, html:this.html})
        this._render()
    }
}

helper.pro.treasureShop.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    #counter{display:inline-block; color:green; margin-left:123px; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:174px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:8px; padding-right:0px; box-shadow:3px 3px 6px gray;}
    #items{height:210px; overflow-x:hide; overflow-y:auto;}
    #history{height:100px; line-height:25px; padding-left:4px; overflow-x:hide; overflow-y:auto;} 
    div.item{display:inline-block; height:28px; margin:0px; }
    span[name="name"]{display:inline-block; margin-left:2px; width:156px} span[name="price"]{display:inline-block; margin-left:2px; width:120px} span[name="discount"]{display:inline-block; margin-left:2px; width:110px} span[name="count"]{color:purple;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function apply() {
        var items = [];
        for(var div of $("#items").children) {
            items.push({id:Number(div.id), selected:div.children["selected"].checked})
        }
        parent.helper.pro.treasureShop.apply(items)
    }

    function _html(item) {
        return '<div class="item" id="' + item.id + '"><input name="selected" type="checkbox" onclick="apply()"><span name="name"><\/span><span name="price"><\/span><span name="discount"><\/span><span name="count"><\/span><\/div>'
    }

    function render(items, history, state) {
        for (var html="", i=0; i<items.length; ++i) html = html.concat(_html(items[i]))
        $("#items").innerHTML = html

        for (var item of items) {
            var e = $('#'+item.id)
            e.children["selected"].checked = item.selected
            e.children["name"].innerText = item.name
            e.children["price"].innerText = '价格：' + item.price + '钻石'
            e.children["discount"].innerText = '折扣：' + item.discount + '%'
            for(var c of state.counter) c.id==item.id && c.count>0 && (e.children["count"].innerText='已购买'+c.count+'次')  
        }

        html = ""
        history.forEach(e=>html += "" == html ? e : "<br>"+e)
        $("#history").innerHTML = html

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动";
    }

    function action() {
        var o = parent.helper.pro.treasureShop
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>自动购买宝藏商店道具<\/h3>
    <div class="panel">
        <div id="items">
            <div class="item" id="11001">
            <\/div>
        <\/div>
    <\/div>
    <div class="panel">
        <div id="history">
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//空投补给活动
helper.pro.airdropActivity && helper.pro.airdropActivity.free()
helper.pro.airdropActivity = {
    setting: [
        {active:!1, preset:0, prechk:0, count:99999, seconds:99999},
        {active:!0, preset:1, prechk:1, count:1, seconds:10}
    ],
    state:{counter:[0, 0], running:!1},

    _march(ti, preset) {
        var context = helper.battle.backup()
        try {
            Object.assign(new(__require("AirDropPanel").default), {_tileInfo: ti}).onFightClick()
            return helper.battle.setup(preset, 9999) && helper.battle.march()  //设置英雄和士兵并出征
        }
        finally {
            helper.battle.restore(context)
        }
    },

    async _airDrop(point, preset) {
        var ti = __require("NWorldMapController").default.instance.getTileInfoByCoord(point.x, point.y, UserData.ServerId, 0)
        if (await helper.battle.mutex.acquire(2000)) {
            try {
                return await this._march(ti, preset)        //出征
            }
            finally {
                helper.battle.mutex.release()
            }
        }
    },

    async _speedup(o, seconds) {
        while (o && o.marchInfo && 1 == o.marchInfo.state && o.marchInfo.marchArrive - ServerTime > seconds) {
            //520001-行军加速 520002-高级行军加速(优先使用)
            var m = o.marchInfo.marchId, i = UserData.getItemAmount(520002) ? 520002 : UserData.getItemAmount(520001) ? 520001 : 0
            o = m && i && await send(RequestId.MARCH_SPEED_UP, {marchId: m, itemId: i}) && await send(RequestId.GET_MARCH_INFO, {marchId: m}) 
        }    
    },
    
    async _updateMap(b) {
        var a = __require("NWorldMapController").default.instance, y = __require("NWorldMapMarchController").default.instance
        var g = __require("NWorldMapTerritoryModel").default.instance, f = __require("NWorldMapData").default.instance, d = __require("WorldMapMsgs")    

        //更新坐标信息
        var k = UserData.ServerId, r = new Map, s 
        var o = await send(RequestId.GET_WORLD_INFO, {x: b.x, y: b.y, k: k, rid: 0, width: 14, height: 20, marchInfo: !0, viewLevel: 1})
        o && o.pointList && o.pointList.forEach(e=>s = a.updateTileInfo(e, 1), s && r.set(s, !0)) 
        d.send(d.Names.WorldMapUpdateViewPort, r)

        //更新行军信息
        o && o.marchList && (y.model.dealMarchDataFromNowWorldMarchData(o.marchList, !0), y.model.addMonsterDefenderMarchData())
        d.send(d.Names.WorldMapMarchsInit, null)

        //更新联盟领地
        var t = await send(RequestId.GET_TERRITORY_INFO, {x: b.x, y: b.y, k: k, width: 14, height: 20})
        t && t.infos && (g.clearAlianceTerritory(), g.updateAllianceTerritory(t.infos, !1, k))

        return o
    },

    //编队检查
    _precheck(preset, precheck) {
        //单兵检查(含机甲)
        if (0 == preset || 9 == preset) {
            var one = __require("GameTools").default.getAttackerMyArmys().sort((t, e)=>{return t.ArmyData.power - e.ArmyData.power})[0];
            if (!one || (one.battleMechaData && !helper.battle.mechaOk(one.battleMechaData.mechaId)))
                return 0
        }
        //预设编队检查
        if (0 < preset && preset < 9 && precheck) { 
            var heros = __require("HeroController").HeroController.getInstance().getHaveHeroCanMarchList()
              , armys = __require("GameTools").default.getAttackerMyArmys()
              , march = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
            if (!march) return 0

            //检查英雄
            for (var i = 0; i < march.HeroIds.length; ++i) if (!heros.find((e)=>{return e._id == march.HeroIds[i]})) return !1
    
            //检查士兵
            for (var group = {}, i = 0; i < armys.length; ++i) {var n=armys[i].ArmyData.id; group[n] = (group[n] ? group[n] : 0) + 1}
            for (var e of march.Armys) {
                if (e && e.ArmyId && e.isMecha && !helper.battle.mechaOk(e.mechaId)) return !1
                if (e && e.ArmyId && !e.isMecha && (!group[e.ArmyId] || (group[e.ArmyId] -= e.Num)<0)) return !1
            }
        }
        return 1
    },

    //检查目标空投
    _checkTraget(p) {
        //存在行军?
        return !Object.values(__require("NWorldMapData").default.instance.marches).find(e=>e.target_tx == p.x && e.target_ty == p.y)
    },

    async _process(e, t) {
        UserData.UID != 837981059306 && await new Promise(resolve=>{setTimeout(resolve, Math.floor(500 + Math.random()*1500))})
        var n = this.state.counter[t], s = this.setting[t] 
        if (s && n < s.count && UserData.myMarchNumMAX > UserData.myMarchNum && this._precheck(s.preset, s.prechk)) {
            //获取坐标并更新局部地图
            var p = __require("GameTools").default.getWorldPosByServerPointId(e.pt)
            var o = await this._updateMap(p) && this._checkTraget(p) && await this._airDrop(p, s.preset)
            o && o.marchInfo && (this.state.counter[t]++, await this._speedup(o, s.seconds), this._update())
        }
    },
    
    //e:{op:1, pt:32412, info:{id:24600, item:14, point:32412, state:3}} 
    //pt及info.point为坐标，op:1-新增，2修改状态
    //info.id：第一位"2"表示第二轮，2,3位"46"表示第47个补给， 
    //info.item=14表示是第14号箱子(1-50为普通补给，51-55为金色补给)
    //info.state=0为初始状态，1为被拉走，3估计是到达遗迹，没见到2（猜测2是被抢）
    //__require("TableManager").TABLE.getTableDataById("deploy", e.info.item.toString())，返回对象的plot_quality=1表示普通补给，3表示金色补给
    onWorldAirDropUpdate(e) {
        var i = e.info.item, t = this.setting[0].active && (i > 0 && i <= 50) ? 0 : this.setting[1].active && i > 50 ? 1 : -1
        e.op == 1 && e.info.state == 0 && (1===t || !this.setting[1].active || this.setting[1].count <= this.state.counter[1]) && this._process(e, t)
    },

    _start() {
        //捕捉空投事件
        __require("EventCenter").EVENT.on(__require("EventId").EventId.WorldAirDropUpdate, this.onWorldAirDropUpdate, this)
    },

    _stop() {
        //关闭空投事件
        __require("EventCenter").EVENT.off(__require("EventId").EventId.WorldAirDropUpdate, this.onWorldAirDropUpdate, this)
    },

    _update() {
        this._save()
        this._render()
    },
 
    _save() {
        setItem("airdrop-activity", JSON.stringify({setting:this.setting, state:this.state}))        
    },
 
    async _load() {
        var o = await getItem("airdrop-activity")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state)
    },
 
     _render() {
        var iframe = helper.dialog.iframe
        iframe && "airdrop-activity" == iframe.name && iframe.contentWindow.render(this.setting, this.state)
    },
 
    start() {
        !this.state.running && (this.state.running = !0, this._start(), this.state.counter = [0, 0], this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },

    apply(setting) {
        this.setting = setting
        this._update()
    },
    
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    dayInit() {
        this.state.counter = [0, 0], this._update()
    },

    open() {
        helper.dialog.open({name:"airdrop-activity", width:610, height:258, html:this.html})
        this._render() 
    }
}

helper.pro.airdropActivity.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.counter{margin-left:4px; width:100%;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    #counter{display:inline-block; color:green; margin-left:123px; width:130px;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:200px; margin-top:8px; text-align:center; width:80px;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-top:8px; padding-left:12px; box-shadow: 3px 3px 6px gray;}
    .combo-box{display:inline-block; position:relative;} .combo-list{width:70px;} .combo-edit{position:absolute; padding-top:1px; width:50px; height:18px; left:1px; top:1px; border:0px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function editchange(edit) {
        edit.setAttribute("value", Number(edit.value.replace('次','').replace('秒','').replace('内',''))); 
        apply();   
    }

    function listchange(list) {
        var edit = list.parentNode.children["edit"];
        var i = list.selectedIndex;
        edit.value = list.options[i].innerText;
        edit.setAttribute("value", list.options[i].value);
        list.selectedIndex = 0;
        apply();
    }

    function apply() {
        var setting = [{},{}]

        setting[0].active = $("#normal").children["active"].checked
        setting[0].preset = Number($("#normal").children["preset"].value)
        setting[0].count = Number($("#normal").children["count"].children["edit"].getAttribute("value"))
        setting[0].seconds = Number($("#normal").children["seconds"].children["edit"].getAttribute("value"))
        setting[0].precheck = $("#normal").children["precheck"].checked; 

        setting[1].active = $("#orange").children["active"].checked
        setting[1].preset = Number($("#orange").children["preset"].value)
        setting[1].count = Number($("#orange").children["count"].children["edit"].getAttribute("value"))
        setting[1].seconds = Number($("#orange").children["seconds"].children["edit"].getAttribute("value"))
        setting[1].precheck = $("#orange").children["precheck"].checked; 

        parent.helper.pro.airdropActivity.apply(setting)
    }

    function render(setting, state) {
        $("#normal").children["active"].checked = setting[0].active
        $("#normal").children["preset"].value = setting[0].preset
        $("#normal").children["count"].children["edit"].value = (99999 == setting[0].count) ? '无限次' : setting[0].count + '次'
        $("#normal").children["count"].children["edit"].setAttribute("value",setting[0].count)
        $("#normal").children["seconds"].children["edit"].value = (99999 == setting[0].seconds) ? '不加速' :setting[0].seconds + '秒内'
        $("#normal").children["seconds"].children["edit"].setAttribute("value", setting[0].seconds)
        $("#normal").children["precheck"].checked = setting[0].precheck
        $("#normal").children["counter"].innerText = state.counter[0] ? '已运输空投' + state.counter[0] +'次' : '　'
        $("#normal").children["counter"].style.color = state.counter[0] >= setting[0].count ? "green" : state.running ? "purple" : "black"

        $("#orange").children["active"].checked = setting[1].active
        $("#orange").children["preset"].value = setting[1].preset
        $("#orange").children["count"].children["edit"].value = (99999 == setting[1].count) ? '无限次' : setting[1].count + '次'
        $("#orange").children["count"].children["edit"].setAttribute("value",setting[1].count)
        $("#orange").children["seconds"].children["edit"].value = (99999 == setting[1].seconds) ? '不加速' :setting[1].seconds + '秒内'
        $("#orange").children["seconds"].children["edit"].setAttribute("value", setting[1].seconds)
        $("#orange").children["precheck"].checked = setting[1].precheck
        $("#orange").children["counter"].innerText = state.counter[1] ? '已运输空投' + state.counter[1] +'次' : '　'
        $("#orange").children["counter"].style.color = state.counter[1] >= setting[1].count ? "green" : state.running ? "purple" : "black"

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"
    }

    function action() {
        var o = parent.helper.pro.airdropActivity
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>空投补给活动<\/h3>
    <div class="panel" id="orange">
        <input type="checkbox" name="active" onclick="apply()"><label class="label-text">金色空投<\/label>
        <label>　编队:<\/label>
        <select class="combo-list" name="preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <input type="checkbox" name="precheck" onclick="apply()"><label>检查行军<\/label>
        <label>　次数:<\/label>
        <div class="combo-box" name="count">
            <select class="combo-list" name="list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1次<\/option>
                <option value="5">5次<\/option>
                <option value="10">10次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input class="combo-edit" name="edit" onchange="editchange(this)">
        <\/div>
        <label>　加速:<\/label>
        <div class="combo-box" name="seconds">
            <select class="combo-list" name="list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="5">5秒内<\/option>
                <option value="10">10秒内<\/option>
                <option value="99999">不加速<\/option>
            <\/select>
            <input class="combo-edit" name="edit" onchange="editchange(this)">
        <\/div>
        <br>
        <label class="counter" name="counter">　<\/label>
    <\/div>
    <div class="panel" id="normal">
        <input type="checkbox" name="active" onclick="apply()"><label class="label-text">普通空投<\/label>
        <label>　编队:<\/label>
        <select class="combo-list" name="preset" onchange="apply()">
            <option value="0">单兵<\/option>
            <option value="1">编队1<\/option>
            <option value="2">编队2<\/option>
            <option value="3">编队3<\/option>
            <option value="4">编队4<\/option>
            <option value="5">编队5<\/option>
            <option value="6">编队6<\/option>
            <option value="7">编队7<\/option>
            <option value="8">编队8<\/option>
            <option value="9">自动<\/option>
        <\/select>
        <input type="checkbox" name="precheck" onclick="apply()"><label>检查行军<\/label>
        <label>　次数:<\/label>
        <div class="combo-box" name="count">
            <select class="combo-list" name="list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="1">1次<\/option>
                <option value="5">5次<\/option>
                <option value="10">10次<\/option>
                <option value="99999">无限次<\/option>
            <\/select>
            <input class="combo-edit" name="edit" onchange="editchange(this)">
        <\/div>
        <label>　加速:<\/label>
        <div class="combo-box" name="seconds">
            <select class="combo-list" name="list" onchange="listchange(this)">
                <option style="display:none"><\/option>
                <option value="5">5秒内<\/option>
                <option value="10">10秒内<\/option>
                <option value="99999">不加速<\/option>
            <\/select>
            <input class="combo-edit" name="edit" onchange="editchange(this)">
        <\/div>
        <br>
        <label class="counter" name="counter">　<\/label>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//深海寻宝活动
helper.pro.deepseaTreasure && helper.pro.deepseaTreasure.free()
helper.pro.deepseaTreasure = {
    state: {
        running: !1
    },
    history: [],
    
    get aid() {
        var a = __require("ActivityController").ActivityController.Instance.getActivityList()
        var e = a.find(e=>'ActivityDeepSeaTreasure' == e.showUiType)
        return e && e.id 
    },

    get slots() {
        var a = __require("ActivityController").ActivityController.Instance._activityMap[this.aid] 
        return a && a.extra &&a.extra.slots
    },

    get active() {
        var a = __require("ActivityController").ActivityController.Instance._activityMap[this.aid] 
        return a && a.endtime > ServerTime
    },

    _iname(id) {
        var t = __require("TableManager"), n = __require("TableName"), l = __require("LocalManager")
        var o = t.TABLE.getTableDataById(n.TableName.ITEM, id.toString())
        return o && l.LOCAL.getText(o.name)
    },
    
    async _reward() {
        for(var i=0; i<this.slots.length; i++) {
            var e = Object.assign({}, this.slots[i])
            e.s && e.st>0 && e.et<ServerTime && await send(RequestId.AWARD_EXPLORE_SEA, {aid: this.aid, index: i}) && this._log(e)
        }
    },

    async _explore() {
        if (this.active) for(var i=0; i<this.slots.length; i++) {
            var e = this.slots[i]
            !e.s && !e.st && !e.et && await send(RequestId.START_EXPLORE_SEA, {aid: this.aid, index: i}) && setTimeout((i)=>this.slots && this._log(this.slots[i]), 500, i)
        }
    },

    _log(a) {
        this.history.splice(0, this.history.length-29)
        this.history.push({time: ServerTime, item: a})
        this._update()
    },

    async _execute() {
        this.slots && (await this._reward(), await this._explore()) 
    },

    _onTimer() {
        this._execute()
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("deepsea-treasure", JSON.stringify({state:this.state, history:this.history}))
    },

    async _load() {
        var o = await getItem("deepsea-treasure")
        o && (o = JSON.parse(o)) && (this.state = o.state, this.history = o.history)
    },

    _render() {
        function timestr(t) {var a=new Date(); return a.setTime(t*1000), (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}
        function logstr(e) {return timestr(e.time) + ' ' + (e.time > e.item.et ? '领取' : '探到') + this._iname(e.item.i)}

        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "deepsea-treasure") {
            for (var history=[], i=this.history.length-1; i>=0; --i) history.push(logstr.call(this, this.history[i]))
            iframe.contentWindow.render(this.slots, history, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"deepsea-treasure", width:500, height:360, html:this.html})
        this._render() 
    }
}

helper.pro.deepseaTreasure.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:26px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="radio"]{margin-right:1px; vertical-align:top; margin-top:6px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:8px; padding-right:0px; box-shadow: 3px 3px 6px gray;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:145px; margin-top:8px; text-align:center; width:80px;}
    #slots{height:75px;} .col-1{display:inline-block; width:90px;} .col-2{display:inline-block; width:120px;} .col-3{display:inline-block; width:110px;}
    #history{height:160px; line-height:25px; padding-left:8px; overflow-x:hide; overflow-y:auto;} 
    div.item{padding:0px;margin:0px}
    span[name="cname"]{display:inline-block; margin-left:2px; width:156px} span[name="vtime"]{display:inline-block; margin-left:2px; width:100px} span[name="lefttime"]{display:inline-block; margin-left:2px; width:160px}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function onTimer() {
        function format(t) {
            var h = Math.floor(t\/3600)
            var m = Math.floor((t-h*3600)\/60)
            var s = t-h*3600-m*60
            return (100+h).toString().substring(1) + ':' + (100+m).toString().substring(1) + ':' + (100+s).toString().substring(1)
        }

        for (var e of $("#slots").children) {
            var o = e.children["expire"], v = e.children["iname"], t = parent.ServerTime
            o && o.value && 0==o.value.s && (o.innerText = '未探测')
            o && o.value && 1==o.value.s && o.value.et<t && (o.innerText = '待领取')
            o && o.value && 1==o.value.s && o.value.et>=t && (o.innerText = format(o.value.et-t))
            o && o.value && o.value.i && (v.innerText = parent.helper.pro.deepseaTreasure._iname(o.value.i))
        } 
    }

    function render(slots, history, state) {
        if (slots) for(var i=0; i<slots.length; ++i) $("#slot-"+i).children["expire"].value = slots[i] 

        for(var html = "", i=0; i<history.length; ++i) html += "" == html ? history[i] : "<br>" + history[i]
        $("#history").innerHTML = html

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动";

        window.timer || (window.timer = setInterval(onTimer, 1000))
        onTimer()
    }

    function action() {
        var o = parent.helper.pro.deepseaTreasure
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>深海寻宝活动<\/h3>
    <div class="panel" id="slots">
        <div id="slot-0">
            <label class="col-1">Slot#1<\/label>
            <label class="col-2" name="expire">未开启<\/label>
            <label class="col-3" name="iname"><\/label>
        <\/div>
        <div id="slot-1">
            <label class="col-1">Slot#2<\/label>
            <label class="col-2" name="expire">未开启<\/label>
            <label class="col-3" name="iname"><\/label>
        <\/div>
        <div id="slot-2">
            <label class="col-1">Slot#3<\/label>
            <label class="col-2" name="expire">未开启<\/label>
            <label class="col-3" name="iname"><\/label>
        <\/div>
    <\/div>
    <div class="panel">
        <div id="history">
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//矿产大亨活动
helper.pro.dwarfMiner && helper.pro.dwarfMiner.free()
helper.pro.dwarfMiner = {
    setting: {
        cIndex: 0
    },
    state: {
        running: !1
    },
    history: [],
    
    get aid() {
        var a = __require("ActivityController").ActivityController.Instance.getActivityList()
        var e = a.find(e=>'ActivityDwarfMiner' == e.showUiType)
        return e && e.id 
    },

    get data() {
        var a = __require("ActivityController").ActivityController.Instance._activityMap[this.aid] 
        return a && a.extra && a.extra.map
    },

    get active() {
        var a = __require("ActivityController").ActivityController.Instance._activityMap[this.aid] 
        return a && a.endtime > ServerTime
    },

    _iname(id) {
        var t = __require("TableManager"), n = __require("TableName"), l = __require("LocalManager")
        var o = t.TABLE.getTableDataById(n.TableName.ITEM, id.toString())
        return o && l.LOCAL.getText(o.name)
    },

    _cname(cId) {
        var t = __require("TableManager"), n = __require("TableName"), l = __require("LocalManager")
        var o = t.TABLE.getTableDataById(n.TableName.miner_chest_open, cId.toString())
        o && (o = t.TABLE.getTableDataById(n.TableName.REWARD, o.reward.toString()))
        o && (o = t.TABLE.getTableDataById(n.TableName.ITEM, o.item))
        return o && l.LOCAL.getText(o.name)
    },

    cnum(cId) {
        var t = __require("TableManager"), n = __require("TableName")
        var o = t.TABLE.getTableDataById(n.TableName.miner_chest_open, cId.toString())
        o && (o = t.TABLE.getTableDataById(n.TableName.REWARD, o.reward.toString()))
        return o && o.num
    },

    _vtime(cId) {
        var t = __require("TableManager"), n = __require("TableName")
        var e = t.TABLE.getTableDataById(n.TableName.miner_chest_open, cId.toString())
        return e && e.vanish_time
    },
    
    async _reward() {
        var a = this.data.list.find(e=>e.expireTime > 0 && e.expireTime <= ServerTime)
        a && (a = await send(RequestId.DWARF_MINER_OPEN_CHEST, {activityID: this.aid, cIndex: a.cIndex}))
        a && a.chestIndex == this.setting.cIndex && (this.setting.cIndex = null)
        a && a.reward && this._log(a)
    },

    async _unlock() {
        if (!this.data.list.find(e=>e.expireTime > 0)) { 
            var i = this.setting.cIndex 
            i || (i = this.data.list.concat().sort((d,e)=>this._vtime(d.cId) - this._vtime(e.cId))[0].cIndex)
            i && await send(RequestId.DWARF_MINER_UNLOCK_CHEST, {activityID: this.aid, cIndex: i})
        }
    },

    async _dig() {
        var n = Number(__require("GameTools").default.getDataConfigData(15039))
        while (this.active && this.data.digCount < n && this.data.list.length < 4) {
            var o = await send(RequestId.DWARF_MINER_DIG, {activityID: this.aid})
            o && o.reward && this._log(o)
        }
    },

    _log(a) {
        this.history.splice(0, this.history.length-29) 
        this.history.push({time: ServerTime, item: a})
        this._update()
    },

    async _execute() {
        if (this.data) {
            await this._reward()
            await this._dig()
            await this._unlock() 
        } 
    },


    _onTimer() {
        this._execute()
    },

    _start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    _stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    _update() {
        this._save()
        this._render()
    },

    _save() {
        setItem("dwarf-miner", JSON.stringify({setting:this.setting, state:this.state, history:this.history}))
    },

    async _load() {
        var o = await getItem("dwarf-miner")
        o && (o = JSON.parse(o)) && (this.setting = o.setting, this.state = o.state, this.history = o.history)
    },

    _render() {
        function timestr(t) {var a=new Date(); return a.setTime(t*1000), (a.getMonth()+1)+'-'+a.getDate()+" "+a.getHours()+":"+a.getMinutes().toString().padStart(2,'0')+":"+a.getSeconds().toString().padStart(2,'0')}
        function logstr(e) {
            var str = timestr(e.time)
            e.item.reward && (str += '  奖励:' + this._iname(e.item.reward.items[0].itemId) + ", 数量:"+e.item.reward.items[0].itemCount)
            e.item.digCount && (str += '  第' + e.item.digCount + '次挖矿')
            return str
        }

        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "dwarf-miner") {
            var chest = [], history=[]
            this.data && this.data.list.forEach(e=>chest.push({cIndex:e.cIndex, cname:this._cname(e.cId), vtime:this._vtime(e.cId), expire:e.expireTime}))
            for (var i=this.history.length-1; i>=0; --i) history.push(logstr.call(this, this.history[i]))
            iframe.contentWindow.render(this.setting, chest, history, this.state)
        }
    },

    start() {
        !this.state.running && (this.state.running = !0, this._start(), this._update())
    },
     
    stop() {
        this.state.running && (this.state.running = !1, this._stop(), this._update())
    },
     
    apply(cIndex) {
        this.setting.cIndex = Number(cIndex)
        this._update()
    },
     
    async init() {
        await this._load()
        this.state.running && this._start()
    },

    free() {
        this._stop()
    },

    open() {
        helper.dialog.open({name:"dwarf-miner", width:500, height:391, html:this.html})
        this._render() 
    }
}

helper.pro.dwarfMiner.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:26px; vertical-align:top; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-top:12px; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    label.caption{display:inline-block; width:80px;}
    span{margin-left:20px; margin-right:0px;}
    input{color:#333;border:1px solid #999; border-radius:3px; outline-style:none; margin-right:12px; padding-top:2px; height:20px;}
    input[type="radio"]{margin-right:1px; vertical-align:top; margin-top:6px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px; height:20px; }
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; margin-top:0px; width:60px; height:22px;}
    button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    input::-webkit-input-placeholder{color: #aaa;}
    div.panel{border:1px solid silver; border-radius:6px; margin:8px; padding:4px; padding-left:8px; padding-right:0px; box-shadow: 3px 3px 6px gray;}
    #state{margin-left:10px; margin-top:8px; text-align:center; height:20px}
    #action{margin-left:140px; margin-top:8px; text-align:center; width:80px;}
    #chest{height:104px;}
    #history{height:160px; line-height:25px; padding-left:8px; overflow-x:hide; overflow-y:auto;} 
    div.item{padding:0px;margin:0px}
    span[name="cname"]{display:inline-block; margin-left:2px; width:156px} span[name="vtime"]{display:inline-block; margin-left:2px; width:100px} span[name="lefttime"]{display:inline-block; margin-left:2px; width:160px}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function onTimer() {
        function format(t) {
            var h = Math.floor(t\/3600)
            var m = Math.floor((t-h*3600)\/60)
            var s = t-h*3600-m*60
            return (100+h).toString().substring(1) + ':' + (100+m).toString().substring(1) + ':' + (100+s).toString().substring(1)
        }

        for (var e of $("#chest").children) {
            var o = e.children["expire"]
            o.value && (o.innerText = format(o.value-parent.ServerTime))
        } 
    }

    function apply(e) {
        var id = e.parentNode.id
        id && parent.helper.pro.dwarfMiner.apply(id.substring(6));
    }

    function render(setting, chest, history, state) {
        var html=""
        chest.forEach(e=>{
            html += '<div class="item" id="index_'+e.cIndex+'"><input type="radio" name="prior" onclick="apply(this)">',
            html += '<span name="cname">'+e.cname+'<\/span>',
            html += '<span name="vtime">'+(e.vtime\/60)+'小时<\/span>',
            html += '<span name="expire"><\/span><\/div>'
        })
        $("#chest").innerHTML = html

        chest.forEach(e=>$("#index_"+e.cIndex).children["expire"].value = e.expire)
   
        html = ""
        history.forEach(e=>html += "" == html ? e : "<br>"+e)
        $("#history").innerHTML = html

        chest.length && setting.cIndex && (
            $("#index_"+setting.cIndex).children["prior"].checked = !0,
            $("#index_"+setting.cIndex).children["expire"].value == 0 && ( 
                $("#index_"+setting.cIndex).children["expire"].innerText = "下轮优先",
                $("#index_"+setting.cIndex).children["expire"].style.color = state.running ? "purple": "black" 
            )
        )

        $("#state").innerText = state.running ? "运行中" : "未运行"
        $("#state").style.backgroundColor = state.running ? "greenyellow" : "#aaa"
        $("#state").style.borderRadius = "2px"

        $("#action").innerText = state.running ? "停止" : "启动"

        window.timer || (window.timer = setInterval(onTimer, 1000))
        onTimer()
    }

    function action() {
        var o = parent.helper.pro.dwarfMiner
        o.state.running ? o.stop() : o.start()
    }
<\/script>
<\/head>
<body>
    <h3>矿产大亨活动<\/h3>
    <div class="panel" id="chest">
    <\/div>
    <div class="panel">
        <div id="history">
        <\/div>
    <\/div>
    <span id="state">未运行<\/span>
    <button id="action" onclick="action()">启动<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//遗迹资源信息
helper.pro.fortressResource = {
    resources:[],

    async _search(x, y) {
        var o = await this._getWorldInfo(x, y)
        //pointType=38:联盟田
        o && o.pointList && o.pointList.forEach(p=>p.r && p.pointType == 38 && !this.resources.find(e=>e.x==p.x && e.y==p.y) && this.resources.push(p))
    },

    async _getWorldInfo(x, y) {
        return send(RequestId.GET_WORLD_INFO, {
                x: x,
                y: y,
                k: UserData.ServerId,
                rid: 0,
                width: 28,
                height: 40,
                marchInfo: !1,
                viewLevel: 1
            }
        )
    },

    async _getResources() {
        this.resources = []
        await this._search(408-80,308) 
        await this._search(408,308) 
        await this._search(408+80,308)

        await this._search(408-80,648) 
        await this._search(408, 648) 
        await this._search(408+80,648)
   },

    _render() {
        var iframe = helper.dialog.iframe;
        if (iframe && iframe.name == "fortress-resource") {
            var res = this.resources.concat().sort((d,e)=>
                Math.abs(d.r.expireTime-e.r.expireTime)>3 ? e.r.expireTime - d.r.expireTime :
                d.r.itemId != e.r.itemId ? d.r.itemId - e.r.itemId :
                d.r.ownerId != e.r.ownerId ? d.r.ownerId - e.r.ownerId :
                d.x != e.x ? d.x - e.x : d.y - e.y 
            )

            //翻译田类型
            res.forEach(e=>{
                var data = __require("TableManager").TABLE.getTableDataById(__require("TableName").TableName.RESOURCE, e.r.itemId.toString())
                e.text = data && __require("LocalManager").LOCAL.getText(data.name.toString())
            })

            iframe.contentWindow.render(res)
        }
    },

    goto(e) {
        var f = __require("WorldMapTools")
          , r = __require("NWorldMapData").default.instance.serverData.currentSubMap

        e = e.innerText.split(',')   
        e.length == 2 && (f.default.goToWorldMapByPos({
            x: e[0],
            y: e[1],
            s: UserData.ServerId,
            subMap: r
        }), this.close())
    },

    async open() {
        helper.dialog.open({name:"fortress-resource", width:480, height:390, html:this.html})
        await this._getResources()
        this._render() 
    },

    close() {
        helper.dialog.close()
    }
}

helper.pro.fortressResource.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; padding:8px; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-bottom:8px; text-align:center; width:100%}
    div.panel{border:1px solid silver; border-radius:6px; margin-bottom:8px; padding:10px; padding-right:0px; box-shadow:3px 3px 6px gray;}
    div.container{height:260px; overflow:auto;}
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; height:22px;} button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    table,th,td{font-size:14px; font-family:"monospace"; border: 1px solid #aaa; border-collapse: collapse; text-align:left;} th{background-color: #ddd; white-space: nowrap;}
    #download{margin-left:185px; margin-top:8px; width:80px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function render(resources) {
        for (var i=0; i<resources.length; ++i) {
            var e = resources[i]

            var row = document.createElement('tr')
            var col = document.createElement('td')
            col.innerText = (i+1).toString()
            row.appendChild(col)
            
            //资源坐标
            col = document.createElement('td')
            col.innerHTML = '<a href="javascript:void(0);" onclick="parent.helper.pro.fortressResource.goto(this)">' + e.x + ',' + e.y + '<\/a>'
            row.appendChild(col)
            
            //资源类型
            col = document.createElement('td')
            col.innerText = e.text 
            row.appendChild(col)

            //刷新时间
            col = document.createElement('td')
            var t = new Date((e.r.expireTime - 14400)*1000)
            col.innerText = (t.getMonth()+1) + '-' + t.getDate() + ' ' + t.getHours() + ':' + t.getMinutes().toString().padStart(2,'0') + ":" + t.getSeconds().toString().padStart(2,'0')
            row.appendChild(col)

            //占有者
            col = document.createElement('td')
            col.innerText = e.r.playerInfo ? JSON.parse(e.r.playerInfo).username : ''
            row.appendChild(col)

            $('#resources').children[1].appendChild(row)
        }
    }

    function download() {
        var html = "<html><head><meta charset='utf-8' \/><\/head><body>" + document.getElementsByTagName("table")[0].outerHTML + "<\/body><\/html>";
        var blob = new Blob([html], { type: "application\/vnd.ms-excel" })

        var a = document.createElement('a')
        a.href = URL.createObjectURL(blob), a.download = "fortress-res.xls", a.style.display = 'none'
        document.body.appendChild(a) && a.click() && document.body.removeChild(a)
    }
<\/script>
<\/head>
<body>
    <h3>遗迹资源信息<\/h3>
    <div class="panel">
        <div class="container">
            <table id="resources" cellpadding="2px">
                <thead>
                    <tr><th>序号<\/th><th>资源坐标<\/th><th>资源类型<\/th><th>刷新时间<\/th><th>采集人<\/th><\/tr>
                <thead>
                <tbody>
                <\/tbody>
            <\/table>
        <\/div>
    <\/div>
    <button id="download" onclick="download()">下载<\/button>
<\/body>
<\/html>`


//-------------------------------------------------------------------------------------------------
//宝藏卡车信息
helper.pro.treasureCar = {
    config:[
        {name:'四国曙光之地', points:[
            {label: "中立区A1", x: 935, y: 345},
            {label: "中立区B1", x: 935, y: 935},
            {label: "中立区C1", x: 345, y: 935},
            {label: "中立区D1", x: 345, y: 345},
            {label: "中立区E1", x: 835, y: 445},
            {label: "中立区F1", x: 835, y: 835},
            {label: "中立区G1", x: 445, y: 835},
            {label: "中立区H1", x: 445, y: 445}]
        },
        {name:'八国永恒之地', points:[
            {label: "中立区A2", x: 573, y: 189},
            {label: "中立区B2", x: 934, y: 206},
            {label: "中立区C2", x: 950, y: 572},
            {label: "中立区D2", x: 937, y: 935},
            {label: "中立区D3", x: 780, y: 776},
            {label: "中立区E2", x: 575, y: 953},
            {label: "中立区F2", x: 209, y: 937},
            {label: "中立区G2", x: 194, y: 560},
            {label: "中立区H2", x: 207, y: 207},
            {label: "中立区H3", x: 365, y: 365}]
        },
        {name:'八国曙光之地', points:[
            {label: "中立区A2", x: 573, y: 189},
            {label: "中立区B2", x: 934, y: 206},
            {label: "中立区C2", x: 950, y: 572},
            {label: "中立区D2", x: 937, y: 935},
            {label: "中立区D3", x: 780, y: 776},
            {label: "中立区E2", x: 575, y: 953},
            {label: "中立区F2", x: 209, y: 937},
            {label: "中立区G2", x: 194, y: 560},
            {label: "中立区H2", x: 207, y: 207},
            {label: "中立区H3", x: 365, y: 365}]
        }
    ],

    //查找宝藏卡车押运信息
    //marchType==74,宝藏卡车，rName:驻守人, reinforceSkin>=0, 当自己驻守时:rName="", ownerSkin>=0 ,即：当无人驻守时，ownerSkin == -1 && reinforceSkin == -1
    async _getMarches(e) {
        this.marches = []
        var o = await send(RequestId.GET_WORLD_INFO, {x:e.x, y:e.y, k:UserData.ServerId, marchInfo:!0, viewLevel:1})   // x,y:宝藏卡车起始坐标
        if (o && o.marchList) {
            for(var e of o.marchList) {
                if (74 == e.marchType) {
                    e.escort = e.ownerSkin>=0 || e.reinforceSkin>=0 ? await send(RequestId.SPECIAL_CAR_INFO, {marchId: e.marchId}) : null
                    this.marches.push(e)
                }
            }
        }
        this.marches.sort((d,e)=>e.marchArrive - d.marchArrive)
    },

    _render() {
        var iframe = helper.dialog.iframe
        if (iframe && iframe.name == "treasure-car") {
            var c = this.config[this.index]
            iframe.contentWindow.render(c, this.selected, this.marches)
        }
    },

    async _execute() {
        this.selected ? await this._getMarches(this.selected) : (this.marches = [])
        this._render()
    },

    async _onTimer() {
        if (!this.busy) {
            try {this.busy = 1, await this._execute()} finally{this.busy = 0}
        }      
    },

    apply(label) {
        var c = this.config[this.index]
        this.selected = c && c.points.find(e=>e.label == label)
        this._onTimer()
    },

    goto_1(march) {
        if (1 == march.state) {
            var r = (ServerTime - march.marchStartTime)\/(march.marchArrive - march.marchStartTime)
            var x = Math.floor((march.target.tx-march.begin.bx)*r + march.begin.bx)
            var y = Math.floor((march.target.ty-march.begin.by)*r + march.begin.by) 
            1 == (x % 2 + y % 2) && y++
            __require("WorldMapTools").default.goToWorldMapByPos({x: x, y: y, s: march.begin.bk, subMap: 0})
            this.close()
        }
    },

    goto_2(march) {
        if (march && march.marchInfo) {
            var x = march.marchInfo.begin.bx
            var y = march.marchInfo.begin.by 
            var s = march.marchInfo.begin.bk
            __require("WorldMapTools").default.goToWorldMapByPos({x: x, y: y, s: s, subMap: 0})
            this.close()
        }
    },

    init() {
        var m = __require("GameTools")
        this.index = m.default.isC4Open() ? 0 : m.default.isC8Open() ? 1 : m.default.isC8S2Open() ? 2 : -1
        this.selected = null
        this.marches = []
    },

    open() {
        helper.dialog.open({name:"treasure-car", width:750, height:500, html:this.html, onclose:this.onclose.bind(this)})
        //this.timer = setInterval(this._onTimer.bind(this), 1000)
        this._onTimer()
    },

    close() {
        helper.dialog.close()
    },

    onclose() {
        clearInterval(this.timer)
    }
}

helper.pro.treasureCar.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; padding:4px; margin-bottom:0px; padding-bottom:0px; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-bottom:8px; text-align:center; width:100%}
    label{margin-left:2px; margin-right:2px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    select{color:#333; border:1px solid #999; border-radius:4px; outline-style:none; margin-left:0px; padding-top:1px;}
    div.panel{border:1px solid silver; border-radius:6px; margin-bottom:8px; padding:10px; padding-right:0px; box-shadow:3px 3px 6px gray;}
    div.container{height:360px; overflow-x:auto; overflow-y:auto;}
    button{border:1px solid #999; border-radius:3px; outline-style:none; text-align:center; height:22px;} button:hover{background-color:#ccc;} button:focus{background-color:#ccc;} button:active{transform: translateY(1px);}
    thead{background-color: #ddd; white-space: nowrap;} tbody{white-space: nowrap;}
    table,th,td{font-size:14px; font-family:"monospace"; border: 1px solid #aaa; border-collapse: collapse; text-align:left;} th{background-color: #ddd; white-space: nowrap;}
    #config{height:26px}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function escortInfo(e) {
        var TABLE = parent.__require("TableManager").TABLE
        var TableName = parent.__require("TableName").TableName
        var s = '<a href="javascript:void(0);" onclick="parent.helper.pro.treasureCar.goto_2(this.parentNode.march)">' + e.marchInfo.name + '<\/a>  '
        
        //驻守兵种数量
        var g = {}
        e && e.armyInfoList.forEach(e=>{
            var o = TABLE.getTableDataById(TableName.ARMY, e.armyId)
            var k = o && ((o.type - o.type % 100) * 100 + o.level)
            k && (g[k] = (g[k] ? g[k] : 0) + e.armyDbIds.length + (o.mecha_id ? 10000 : 0))
        })

        for(var k in g) {
            var t = Math.floor(k\/1000)
            var l = Math.floor(k%1000)
            var n = g[k] % 10000
            var m = (g[k] > 10000) ? "(*)" : ""
            s += l + '级' + (t == 10 ? '陆' : t == 20 ? '海' : '30' ? '空' : t) + ':' + n + m + ', '  
        }
        s = s.substring(0, s.length-2)
        return s
    }

    function render(config, selected, marches) {
        $("#area").options.length = 0
        for(var i = 0, a = config; a && i < a.points.length; ++i) {
            var e = a.points[i]
            var option = new Option(e.label, e.label)
            //option.selected = selected && (e.label == selected.label)
            $("#area").options.add(option)
        }
        $("#area").value = selected ? selected.label : ""

        $("#marches").children[1].innerHTML = ""
        for(var i = 0; i < marches.length; ++i) {
            var e = marches[i]
            var row = document.createElement('tr')
            var col = document.createElement('td')
            col.march = e
            //col.innerHTML = '<a href="javascript:void(0);" onclick="parent.helper.pro.treasureCar.goto_1(this.parentNode.march)">' + (i+1).toString().padStart(3,'0') + '<\/a>'
            col.innerHTML = '<a href="javascript:void(0);" onclick="parent.helper.pro.treasureCar.goto_1(this.parentNode.march)">' + e.name + '<\/a>'
            row.appendChild(col)

            //col = document.createElement('td')
            //col.innerText = e.name
            //row.appendChild(col)
           
            //资源信息
            col = document.createElement('td')
            col.innerText = e.lv + '级, ' + (100 == e.rate ? 0 : 75 == e.rate ? 1 : 50 == e.rate ? 2 : 3) + '次'
            row.appendChild(col)

            //驻守1
            col = document.createElement('td')
            e.escort && e.escort.ownerMarch && (
                col.march = e.escort.ownerMarch, 
                col.innerHTML = escortInfo(col.march)
            )
            row.appendChild(col)

            //驻守2
            col = document.createElement('td')
            e.escort && e.escort.reinforceMarch && (
                col.march = e.escort.reinforceMarch, 
                col.innerHTML = escortInfo(col.march)
            )
            row.appendChild(col)

            //剩余时间
            var t = Math.max(0, e.marchArrive - parent.ServerTime), h = Math.floor(t\/3600), m = Math.floor((t-h*3600)\/60), s = t-h*3600-m*60
            col = document.createElement('td')
            col.innerText = h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0') + ':' + s.toString().padStart(2,'0')
            row.appendChild(col)

            $('#marches').children[1].appendChild(row)
        }
    }

    function apply() {
        parent.helper.pro.treasureCar.apply($("#area").value)    
    }
<\/script>
<\/head>
<body>
    <h3>宝藏卡车信息<\/h3>
    <div id=config class="panel">
        <label>选择中立区:<\/label>
        <select id="area" style="width:100px"; onchange="apply()">
        <\/select>
    <\/div>
    <div class="panel">
        <div class="container">
            <table id="marches" cellpadding="2px">
                <thead>
                    <tr><th>所有者<\/th><th>资源信息<\/th><th>驻守1<\/th><th>驻守2<\/th><th>剩余时间<\/th><\/tr>
                <\/thead>
                <tbody>
                <\/tbody>
            <\/table>
        <\/div>
    <\/div>
<\/body>
<\/html>`


helper.pro.miscRewards && helper.pro.miscRewards.free()
helper.pro.miscRewards = {
    setting: {
        dailygift: !1,     //每日补给
        diamond: !1,       //钻石金币
        alliance: !1,      //联盟帮助 
        wilderness: !1,    //荒野行动
        adventure: !1,     //远征行动
        island: !1,        //岛屿扫荡
        bargain: !1        //折扣商城
    },

    _save() {
        setItem("misc-rewards", JSON.stringify({setting:this.setting}))
    },

    async _load() {
        var o = await getItem("misc-rewards")
        o && (o = JSON.parse(o)) && (
            o.setting.dailygift && (this.setting.dailygift = o.setting.dailygift),
            o.setting.diamond && (this.setting.diamond = o.setting.diamond),
            o.setting.alliance && (this.setting.alliance = o.setting.alliance),
            o.setting.wilderness && (this.setting.wilderness = o.setting.wilderness),
            o.setting.adventure && (this.setting.adventure = o.setting.adventure),
            o.setting.island && (this.setting.island = o.setting.island),
            o.setting.bargain && (this.setting.bargain = o.setting.bargain)
        )
    },

    _start() {
        this.setting.dailygift && helper.pro.dailyGift.start()
        this.setting.diamond && helper.pro.dayDiamond.start()
        this.setting.alliance && helper.pro.allianceHelp.start()
        this.setting.adventure && helper.pro.adventureReward.start()
        this.setting.wilderness && helper.pro.wildernessReward.start()
        this.setting.island && helper.pro.isleSweep.start()
        this.setting.bargain && helper.pro.bargainShop.start()
    },

    _stop() {
        this.setting.dailygift || helper.pro.dailyGift.stop()
        this.setting.diamond || helper.pro.dayDiamond.stop()
        this.setting.alliance || helper.pro.allianceHelp.stop()
        this.setting.adventure || helper.pro.adventureReward.stop()
        this.setting.wilderness || helper.pro.wildernessReward.stop()
        this.setting.island || helper.pro.isleSweep.stop()
        this.setting.bargain || helper.pro.bargainShop.stop()
    },

    apply(setting) {
        this.setting = setting
        this._save(), this._stop(), this._start()
    },

    async init() {
        helper.pro.dailyGift.init && helper.pro.dailyGift.init()
        helper.pro.dayDiamond.init && await helper.pro.dayDiamond.init()
        helper.pro.allianceHelp.init && helper.pro.allianceHelp.init()
        helper.pro.adventureReward.init && await helper.pro.adventureReward.init()
        helper.pro.wildernessReward.init && await helper.pro.wildernessReward.init()
        helper.pro.isleSweep.init && await helper.pro.isleSweep.init()
        helper.pro.bargainShop.init && await helper.pro.bargainShop.init()
        await this._load(), this._start()
    },

    free() {
        this._stop()
    },

    dayInit() {
        helper.pro.dailyGift.dayInit && helper.pro.dailyGift.dayInit()
        helper.pro.dayDiamond.dayInit && helper.pro.dayDiamond.dayInit()
        helper.pro.allianceHelp.dayInit && helper.pro.allianceHelp.dayInit()
        helper.pro.adventureReward.dayInit && helper.pro.adventureReward.dayInit()
        helper.pro.wildernessReward.dayInit && helper.pro.wildernessReward.dayInit()
        helper.pro.isleSweep.dayInit && helper.pro.isleSweep.dayInit()
        helper.pro.bargainShop.dayInit && helper.pro.bargainShop.dayInit()
     },

    async open() {
        helper.dialog.open({name:"misc-rewards", width:500, height:200, html:this.html})
        helper.dialog.iframe.contentWindow.render(this.setting) 
    }
}

helper.pro.miscRewards.html = String.raw
`<html charset="UTF-8">
<head>
<style>
    body{line-height:30px; vertical-align:top; padding:8px; font-size:14px; font-family:"Helvetica","Lucida Console","Microsoft soft";}
    h3{display:block; margin-bottom:8px; text-align:center; width:100%}
    div.panel{border:1px solid silver; border-radius:6px; margin-bottom:8px; padding:10px; padding-right:0px; box-shadow:3px 3px 6px gray; height:100px;}
    input[type="checkbox"]{margin-right:1px; vertical-align:top; margin-top:8px; width:14px; height:14px;}
    label{margin-right:12px;}
<\/style>
<\/script>      
<script>
    function $(a) {
        return a && '#'==a[0] && document.getElementById(a.substring(1))
    }

    function render(setting) {
        $('#dailygift').checked = setting.dailygift
        $('#diamond').checked = setting.diamond
        $('#alliance').checked = setting.alliance
        $('#adventure').checked = setting.adventure
        $('#wilderness').checked = setting.wilderness
        $('#island').checked = setting.island
        $('#bargain').checked = setting.bargain
    }
    function apply() {
        var setting = {}
        setting.dailygift = $('#dailygift').checked
        setting.diamond = $('#diamond').checked
        setting.alliance = $('#alliance').checked
        setting.adventure = $('#adventure').checked
        setting.wilderness = $('#wilderness').checked
        setting.island = $('#island').checked
        setting.bargain = $('#bargain').checked
        parent.helper.pro.miscRewards.apply(setting)
    }
<\/script>
<\/head>
<body>
    <h3>自动常规任务<\/h3>
    <div class="panel">
        <input type="checkbox" id="dailygift" onclick="apply()"><label>每日补给<\/label>
        <input type="checkbox" id="diamond" onclick="apply()"><label>钻石金币<\/label>
        <input type="checkbox" id="alliance" onclick="apply()"><label>联盟帮助<\/label>
        <input type="checkbox" id="wilderness" onclick="apply()"><label>荒野行动<\/label>
        <input type="checkbox" id="adventure" onclick="apply()"><label>远征行动<\/label>
        <input type="checkbox" id="island" onclick="apply()"><label>岛屿扫荡<\/label>
        <input type="checkbox" id="bargain" onclick="apply()"><label>折扣商城<\/label>
    <\/div>
<\/body>
<\/html>`

helper.pro.dailyGift && helper.pro.dailyGift.free()
helper.pro.dailyGift = {
    async _execute() {
        var TABLE = __require("TableManager").TABLE, TableName = __require("TableName").TableName
        var o = TABLE.getTableDataById(TableName.ONLINE_REWARD, (UserData.timeReward.times+1))
        if (o && o.time && o.time < ServerTime - UserData.timeReward.rewardTime) {
            o = await send(RequestId.GetTimeReward, {})
            o && o.timeReward && UserData.updateTimeReward(o.timeReward)
        }

    },

    async _onTimer() {
        if (!this.busy) try {this.busy = 1, await this._execute()} finally{this.busy = 0}
    },

    start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    init() {
    },

    free() {
        this.stop()
    }      
}

//-------------------------------------------------------------------------------------------------
//领取每日钻石
helper.pro.dayDiamond && helper.pro.dayDiamond.free()
helper.pro.dayDiamond = {
    async _execute() {
        var d = __require("TableManager").TABLE.getTableDataById("data_config", "5012")
        var n = d && d.value && d.value.split("|").length
        UserData.GoldVideoCount < n && await send(RequestId.VideoRewardGet, {type: 8, param1: "", param2: ""})

        UserData.FreeCoinData.ShareCount < UserData.FreeCoinData.ShareMaxCount && await send(RequestId.FreeCoinShare, {type: 1})
    },   
    
    _onTimer() {
        this._execute()
    },

    start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 30000))
    },

    stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    dayInit() {
        var t = new Date(ServerTime*1000)
        if (0 === t.getHours() && 0 === t.getMinutes() && 3 > t.getSeconds()) {
            UserData._dayGoldVideoCount = 0
            UserData.FreeCoinData._ShareCount = 0
        }
    },

    init() {
        //打开领取每日钻石
        __require("GameTools").default.canGetVideoDiamondByMonthlyCard = ()=>!1

        //跳过广告领取钻石
        __require("TableManager").TABLE.getTableGroup("data_config")[138005].value='0'

        //每人免费领取金币
        __require("PlatformCommon").PlatformCommon.canRewardVideoAd = ()=>!0
    },

    free() {
        this.stop()
    }
}


helper.pro.allianceHelp && helper.pro.allianceHelp.free()
helper.pro.allianceHelp = {
    async _execute() {
        if (UserData.Alliance.AllianceHelpCount < UserData.Alliance.AllianceHelpMax && null == UserData.Alliance.getSelfHelpData()) {
            var t = __require("TableManager").TABLE.getTableGroup(__require("TableName").TableName.ALLIANCE_HELP), a = []
            for (var i = 10003; i < 10007; i++) UserData.Level >= t[i].unlock_level && a.push(t[i])
            a.sort((d,e)=>UserData.getItemAmount(d.reward_param)-UserData.getItemAmount(e.reward_param)) 
            var o = a[0] && await send(RequestId.ALLIANCE_HELP_APPLY, {type: 4, itemId: a[0].id, helpNum: 1})
            o && (
                UserData.Alliance.UpdateAllianceHelpCountAndHonor(o),
                UserData.Alliance.UpdateSelfHelpList(o.selfHelps, !1)
            )
        } 
 
        var t = UserData.Alliance.getSelfHelpData()
        if (t && t.HelpCount >= t.MaxCount) {
            var o = await send(RequestId.ALLIANCE_HELP_RECEIVE, {type: t.Type, qid: "0"})
            UserData.Alliance.DeleteSelfHelpList(t.Type)
        }
    },

    async _onTimer() {
        if (!this.busy) try {this.busy = 1, await this._execute()} finally{this.busy = 0}
    },

    start() {
        this.timer || (
            this.timer = setInterval(this._onTimer.bind(this), 1000)
        )
    },

    stop() {
        this.timer && (
            clearInterval(this.timer), this.timer = 0
        )
    },

    init() {       
    },

    free() {
        this.stop()
    }      
}

helper.pro.adventureReward && helper.pro.adventureReward.free()
helper.pro.adventureReward = {
    async _execute() {
        var a = ServerTime - UserData.AdventureData.ManualCollectTime
        var i = 3600 * parseInt(__require("GameTools").default.getDataConfigData(130073))
        var o = a>i && await send(RequestId.Adventure_Reward, {})
        o && o.userIdle && (
            UserData.AdventureData._CollectTime = o.userIdle.collectTime,
            UserData.AdventureData._ManualCollectTime = o.userIdle.manualCollectTime
        )
    },

    async _onTimer() {
        if (!this.busy) try {this.busy = 1, await this._execute()} finally{this.busy = 0}
    },

    start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    init() {
    },

    free() {
        this.stop()
    }
}

helper.pro.wildernessReward && helper.pro.wildernessReward.free()
helper.pro.wildernessReward = {
    async _execute() {
        var controller = __require("MechaTowerController").MechaTowerController.getInstance()
        if (0 !== controller.getCurRoomId() && controller.isRewardMax()) {
            var o = await sendPB(__require("NRequestId").NRequestId.MECHA_BATTLE_GET_TIME_REWARD, {header: {}, mechaBattleGetTimeReward: {}})
            o && o.pbAck && 0 === o.pbAck.header.s && o.pbAck.mechaBattleGetTimeReward && controller.setRewardStartTime(o.pbAck.mechaBattleGetTimeReward.rewardStartTime)
        }
    },

    async _onTimer() {
        if (!this.busy) try {this.busy = 1, await this._execute()} finally{this.busy = 0}
    },

    start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 1000))
    },

    stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    init() {
    },

    free() {
        this.stop()
    }    
}

helper.pro.isleSweep && helper.pro.isleSweep.free()
helper.pro.isleSweep = {
    async _execute() {
        if (new Date(ServerTime*1000).getHours() > 12) {
            var o = UserData.IsleData
            var o = (o.State == 1 || o.IsClear) && o.ResetTime > 0 && await send(RequestId.ISLE_RESET, {})
            o && UserData.IsleData.UpdateData(o)

            o = UserData.IsleData.getCurrentChapter()
            o = o && o.Index == 0 && o.PathList.length == 0 && await send(RequestId.ISLE_SWEEP, {})
            o && UserData.IsleData.UpdateData(o)
        }
    },

    async _onTimer() {
        if (!this.busy) try {this.busy = 1, await this._execute()} finally{this.busy = 0}
    },

    start() {
        this.timer || (this.timer = setInterval(this._onTimer.bind(this), 10000))
    },

    stop() {
        this.timer && (clearInterval(this.timer), this.timer = 0)
    },

    init() {
    },

    free() {
        this.stop()
    }    
}

//-------------------------------------------------------------------------------------------------
//惊喜折扣商城(打折券砍一刀)
helper.pro.bargainShop && helper.pro.bargainShop.free()
helper.pro.bargainShop = {
    //推送聊天事件
    async _onChatPush(e) {
        if (e.uid != UserData.UID && e.llm) {
            var o = JSON.parse(e.llm)
            o && o.bargain_aid && o.bargain_item_id && UserData.getItemAmount(3953010) > 0 && (
                console.log("bargain_data:", o),
                o = await send(RequestId.BARGAINSHOP_BARGAIN, {aid: Number(o.bargain_aid), item_id: Number(o.bargain_item_id), uid: Number(e.uid)}),
                console.log("bargain_result:", o)
            )
        }  
    },          

    start() {
        this.running || (this.running = !0, __require("EventCenter").EVENT.on("newChatPush", this._onChatPush))
    },

    stop() {
        this.running && (this.running = !1, __require("EventCenter").EVENT.off("newChatPush", this._onChatPush))
    },

    init() {
    },

    free() {
        this.stop()
    }
}


helper.pro.enable()


console.log("Init ultimate functions succeed.")
