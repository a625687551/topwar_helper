//-------------------------------------------------------------------------------------------------
//Mutex定义
var Mutex = class {
    constructor() {
        this.busy = 0
        this.wait = []
    }
    async acquire(timeout) {
        void 0 === timeout && (timeout = 2147483647)
        if (this.busy) {
            return new Promise((resolve)=>{
                var t, f;
                f = (()=>{clearTimeout(t), resolve(1)}), this.wait.push(f) 
                t = setTimeout(()=>{this.wait.splice(this.wait.indexOf(f), 1), resolve(0)}, timeout)
            })   
        }
        else 
            return this.busy = 1
    }

    release() {
        if (this.busy) {
            var f = this.wait.splice(0,1)[0];
            f ? f() : this.busy = 0
        }
    }
}


//-------------------------------------------------------------------------------------------------
//常用游戏数据属性定义
Object.defineProperty(window, "UserData", {
    get: function() {return __require("DataCenter").DATA.UserData}, enumerable: !1, configurable: !0
})

Object.defineProperty(window, "ServerTime", {
    get: function() {return __require("DataCenter").DATA.ServerTime}, enumerable: !1, configurable: !0
})

Object.defineProperty(window, "RequestId", {
    get: function() {return __require("RequestId").RequestId}, enumerable: !1, configurable: !0
})

Object.defineProperty(window, "NET", {
    get: function() {return __require("NetMgr").NET}, enumerable: !1, configurable: !0
})


//-------------------------------------------------------------------------------------------------
//基本函数定义
chrome.webview || (chrome.webview={postMessage:()=>{}})

function find(path, parent) {
    if (null == path) return null;
    
    parent || (parent = cc.find("UICanvas"));
    if (null == parent) return null;

    for (var n = parent, a = path.split("/"), i = "/" !== path[0] ? 0 : 1; i < a.length; i++) {
        var o = a[i];
        var c = n._children;
        var [m,k,d] = (function(s) { var a,b,c,d,e; return(a=s.indexOf('['),b=s.indexOf(']'),c=s.substr(a+1,b-a-1).split(','),
                          a>=0 && b==s.length-1 && c.length<3 && !isNaN(d=c[0]) && !isNaN(e=c[1]||0) ? [s.substr(0,a),d,e] : [s,0,0])
                      })(o);
        n = null;
        for (var l = 0; l<c.length; ++l) {
            var h = !d? c[l] : c[c.length-1-l];
            if (h.name === m) {
                if (k==0) {
                    n = h;
                    break;
                }
                k--;
            }
        }
        if (!n) return null;
    }
    return n;
}

function path(node) {
    for (var i=node,s=i.name,i=i.parent; i.parent; i=i.parent) s = i.name+'/'+s;
    console.log('"'+s+'"');
}

function active(node) {
    node = node instanceof cc.Node ? node : find(node);
    for (var a=node; a.parent; a=a.parent) if (!(a.active && a.opacity)) return !1;
    return !0;
}

function findNode(name, node) {
    node && (node = node instanceof cc.Node ? node : find(node)) || (node = cc.director._scene);
    var a = node && node.getComponentsInChildren(cc.Label);
    for (var c of a) (c.string==name) && (path(c.node), console.log(c.node));
}

function send(rid, data) {
    return new Promise(resolve=>{
        setTimeout(resolve, 5000)
        NET.send(rid, data, null, e=>{resolve(e.d ? JSON.parse(e.d): null)})
    })
}

function sendPB(rid, data) {
    return new Promise(resolve=>{
        setTimeout(resolve, 5000)
        NET.sendPB(rid, data, null, e=>resolve(e))
    })
}

function post(url, req) {
    return new Promise(resolve=>{
        setTimeout(resolve, 5000)
        var httpRequest = new XMLHttpRequest()
        httpRequest.open('POST', url, true)
        httpRequest.setRequestHeader("Content-type","application/x-www-form-urlencoded") //post方式必须设置请求头
        httpRequest.send(req)
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                var rsp = httpRequest.responseText
                resolve(rsp)
            }
        }
    })
}

async function getItem(item) {
    var key = UserData.UID + '-' + item
    var val = await post("https://topwar.me:4433/getitem.php", 'key='+key)
    return val.length>=4 ? val.substring(4) : undefined
} 

async function setItem(item, value) {
    var key = UserData.UID + '-' + item
    return await post("https://topwar.me:4433/setitem.php", 'key='+key+'&val='+value)
}

async function sleep(time) {
    await new Promise(resolve=>setTimeout(resolve, time))
}

//-------------------------------------------------------------------------------------------------
//游戏助手基本定义
helper = {
    _active(node) {
        var f = function(n) { n = n ? n.children : []; for (var i=n.length-1; i>=0; --i) if (n[i].active && n[i].opacity) return n[i] };
        var n = f(cc.find("New Node/New Node")) || f(find("TipsLayer")) || f(find("PopLayer")) || cc.find("UICanvas");
        for (var p=node; p; p=p.parent) {
            if (!(p && p.active && p.opacity)) return !1;
            if (p == n) return !0;
        }
        return !1;
    },
    
    _remove(name) {
        var a = find("PopLayer").children.concat(find("TipsLayer").children);
	    var b = function(n) {if (n) for (c of n._components) if (c.dataInfo) return c.dataInfo}(a[a.length-1]);
	    return b && b._name==name && __require("UIManager").default.Instance().LastCloseUI(b);      
    },

   click(node) {
        if (!this._active('string' == typeof(node) ? node = find(node) : node)) return !1;
        var a = new cc.Touch(node.convertToWorldSpaceAR(cc.Vec2.ZERO));
        var f = function(e) {var o = new cc.Touch(a); o._prevPoint=a; return e=new cc.Event(e), e.touch=(o), e};
        return node.dispatchEvent(f('touchstart')), node.dispatchEvent(f('touchend')), !0;
    },
  
    cleanup() {
        this._remove("ActivityworldPowerPopPR");          //异界能源(活动)
        this._remove("ActivityworldbattlePopPR");         //异界能源晶矿(活动)    
        this._remove("ExpDetailTips");                    //经验提示
        this._remove("NWorldAllianceMinePopup");          //核心建筑
        this._remove("WorldBossDetailPanel");             //元帅/机甲
        this._remove("NWorldCityPopup");                  //城市
        this._remove("NWorldEmpireStorehousePopup");      //帝国宝藏
        this._remove("NWorldMapEnemy");                   //敌军
        this._remove("NWorldMapAssemblyEnemyComponent");  //战锤/俱星
        this._remove("NWorldResourcePopup");              //资源田
        this._remove("NWorldTowerPopup");                 //机械田
        this._remove("NWorldUIRefugeeCamp");              //难民
        this._remove("prefabWorldUIRadarEnemy");          //黑暗军团宝藏              
        this._remove("RadarEnemyPanel");                  //雷达敌军
        this._remove("WorldFunctionTile");                //联盟堡垒
        this._remove("WorldSitePanel");                   //遗迹
        this._remove("WorldThronePopupNew");              //首府
        this._remove("WorldThronePopup");                 //发射井
        this._remove("SimpleDescTips");                   //简单描述(钻石体力提示)
        this._remove("NWorldUIMilitaryQuest");            //帝国狂战机械
        return this._active(find("MainUIWrapper/NMainUI[0,1]/RightBottom/btnHero"));
    },

    closeUI(name) {
        return __require("UIManager").default.Instance().CloseUI(__require("UIDataInfo").UIDataInfo[name]);
    },
    
    openUI(name, t) {
        return __require("UIManager").default.Instance().OpenUI(__require("UIDataInfo").UIDataInfo[name], t);
    }
}


//-------------------------------------------------------------------------------------------------
//游戏助手标准功能
helper.std = {
    openRadar() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnradar") ||
        helper.click("WorldMapUIWrapper/AbyssWorldUI/RightBottom/btnradar");
    },

    openAlliance() {
        helper.cleanup(), 
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnAlliance/btnAlliance") ||
        helper.click("WorldMapUIWrapper/AbyssWorldUI/RightBottom/btnAlliance/btnAlliance");
    },

    openHero() {
        helper.cleanup(), 
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnHero") ||
        helper.click("WorldMapUIWrapper/AbyssWorldUI/RightBottom/btnHero");
    },

    openMail() {
        helper.cleanup(), 
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnMail") ||
        helper.click("WorldMapUIWrapper/AbyssWorldUI/RightBottom/btnMail");
    },

    openBag() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnBag") ||
        helper.click("WorldMapUIWrapper/AbyssWorldUI/RightBottom/btnBag");
    },

    openDaily() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/Bottom/QuestNode/layoutNode/DailyQuestNode/icon") || 
        helper.click("WorldMapUIWrapper/NWorldMapUI/leftBottomNode/dailyQuestNewNode/DailyQuestNode/icon");
    },

    openTask() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/Bottom/QuestNode/layoutNode/MainQuestNode/icon") ||
        helper.click("WorldMapUIWrapper/NWorldMapUI/leftBottomNode/extraNode/QuestNode/layoutNode/MainQuestNode/icon");
    },

    openUserInfo() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/Top/mainTopNode/AuthorBtn");
    },

    openSearch() {
        helper.cleanup(), 
        helper.click("WorldMapUIWrapper/NWorldMapUI/bottomNode/btn_Fight") ||
        helper.click("PopLayer/UIFrameNone/CONTENT/prefabMonsterSearchNew/bg_1/MonsterSearch/btnFix");
    },

    joinAssembly() {
        helper.cleanup(),
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnAlliance/AssemblyMailTipsNode/prefabAssemblyMailTips") ||
        helper.click("PopLayer/UIFrameScreen/CONTENT/AllianceAssemlbyPop/scrollView/view/content/item/"+
                     "2nd_bg_22/New Node/New ScrollView/view/attackLayout/playericon[0,1]/AddNode/img_playerIcon_bg");
    },

    presetList(n) {
        0==n ? (a=find("PopLayer/NBattleMain/ui/BattlePanel/Bottom/New ScrollView/view/content/battleArmyItem[0,1]")) && a._components[0].Click() :
        9==n ? helper.click("PopLayer/NBattleMain/ui/BattlePanel/Bottom/New Layout/btn1") :
               helper.click("PopLayer/NBattleMain/ui/BattlePanel/Bottom/New Layout/presetList/"+(n-1)+"/normal");
    },

    _closeLayer(layer) {
        var a = find(layer).children;
        var b = function(n){if (n) for (var c of n._components) if (c.dataInfo) return c.dataInfo}(a[a.length-1]);
        return b && __require("UIManager").default.Instance().CloseUI(b);
    },
    _closeMsgBox() {
        var n = find("New Node/New Node", cc.director._scene);
        var c = n && n.getComponentInChildren("MsgBoxComponent");
        return c && (__require("MsgBox").close(c), !0);
    },
    
    _closeTopLayer() { return this._closeLayer("TopLayer") },
    _closeTipsLayer() { return this._closeLayer("TipsLayer") },

    _closeBattle() {
        var a =
        helper.click("PopLayer/UIFrameDialog/BG/CLOSE") ||                                  //选择上阵英雄
        helper.click("PopLayer/AdventureBattleWinPanel/bg_black") ||                        //沙盘演习结果       
        helper.click("PopLayer/ArenaBattleWinPanel/ArenaPvePanel1/button_back") ||          //远征胜利结果
        helper.click("PopLayer/ArenaPvpBattleResultPanel/ArenaPvePanel1/button_back") ||    //同战区演习结果
        helper.click("PopLayer/BattleWinPanel/btn1/button_back") ||                         //次元矿
        helper.click("PopLayer/UIFrameNone[0,1]/CONTENT/MonsterLabBattleWinPanel/ArenaPvePanel1/button_back") || // 太平洋活动
        
        helper.click("PopLayer/NBattleMain/ui/BattlePanel/Top/button") ||                   //战斗/出征/设置
        helper.click("PopLayer/NBattleMain/ui/BattleingPanel/Top/skipBtn") ||               //战斗中跳过
        helper.click("PopLayer/NBattleMain/ui/BattleingPanel/Top/btnBack");                 //战斗中返回

        helper.click(find("New Node/New Node/MsgBoxComponent/OUTER/INNER/BUTTONS/BUTTON[0,1]", cc.director._scene)); //确认
        return a;
    }, 
    _closePrior() {
        return !1,
        helper.click("PopLayer/UIFrameNone/CONTENT/HeroRecruitResultPopupNew3/jump") ||     //正在招募
        helper.click("PopLayer/UIFrameNone/CONTENT/HeroRecruitResultPopupNew3/X") ||        //招募结果
        helper.click("PopLayer/UIFrameNone/CONTENT/HeroRecruitPopupNew/HEADER/CLOSE");      //英雄招募
    },
    _closePopLayer() {
        return find("PopLayer/NBattleMain") ? this._closeBattle() : this._closePrior() || this._closeLayer("PopLayer");
    },

    _closeOther() {
        helper.click("MainUIWrapper/NMainUI[0,1]/leftNode/PrefabPlaceHolder/New Node[1]/MainUiShortcutview/MainNode/openNode/CloseNode");  //概览
    },

    close() {
        helper.cleanup(),
        this._closeMsgBox() || this._closeTopLayer() || this._closeTipsLayer() || this._closePopLayer() || this._closeOther();        
    },

    _assembly() {
        return !1,
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldUIRefugeeCamp/2nd_bg_3/btnLayout/Btn") ||                              //集结难民
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldMapAssemblyEnemyComponent/2nd_bg_3/New Layout/Btn");                   //集结战锤/俱星
    },
    _attack() {
        return !1,
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldMapEnemy/2nd_bg_3/btnNode/Btn") ||                                    //攻击敌军/雷达残兵
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldCityPopup/2nd_bg_3/Layout/BtnAttack") ||                              //攻击玩家 
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldEmpireStorehousePopup/2nd_bg_3/contentNode/rewardNode/attackBtn") ||  //攻击博士警卫
        helper.click("PopLayer/WorldBossDetailPanel/2nd_bg_3/attackBtn") ||                                                    //攻击元帅/机甲/宝藏守卫
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldResourcePopup/2nd_bg_3/enemyPopNode/bottomNode/btnNode/AttackBtn")||  //攻击资源田/联盟田
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldTowerPopup/widgetNode/2nd_bg_3/enemyNode/btn2") ||                    //攻击机械田
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldMapAssemblyEnemyComponent/2nd_bg_3/New Layout/attackBtn") ||          //攻击军团据点
        helper.click("PopLayer/UIFrameNone/CONTENT/DimMineDetailView/Btn") ||                                                  //攻击次元矿
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldUIMilitaryQuest/2nd_bg_3/attackNode/attackBtn");                      //帝国狂战机械
    },
    _gather() {
        return !1,
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldResourcePopup/2nd_bg_3/nobodyPopNode/New Layout/New Layout/btnFix") || //采集(资源田/联盟田)  
        helper.click("PopLayer/UIFrameNone/CONTENT/prefabWorldUIRadarEnemy/2nd_bg_3/btnNode/Btn") ||                            //救援/挖掘(雷达任务)
        helper.click("PopLayer/UIFrameNone/CONTENT/NWorldTowerPopup/widgetNode/2nd_bg_3/friendNode/friendArmyNode")||           //驻扎采集(机械田)
        helper.click("PopLayer/UIFrameNone/CONTENT/ActivityworldpowerPopPR/btn") ||                                             //采集(晶元矿)
        helper.click("PopLayer/AirDropPanel/2nd_bg_3/Btn");                                                                     //空投
    },
    _march() {
        var a = find("PopLayer/UIFrameNone/CONTENT/NWorldMapAssemblyEnemyComponent/2nd_bg_3/2nd_bg_21/2nd_title_14/nameLabel");
        a && (a = a.getComponent(cc.Label).string.includes("军团"));
        return !a && this._assembly() || this._attack() || this._gather();
    },

    _forget() {
        return !1,
        helper.click("PopLayer/UIFrameNone[1]/CONTENT/HeroDetailSkillPopup/2nd_bg_3/skill1/content/Bottom/ExclusiveSkill/NewLayout/rBtn") && //卸下
        helper.click("TipsLayer/ConfirmPanel/New Layout[1]/button_yes");              
    },
    _study() {
        return !1,
        helper.click("PopLayer/UIFrameNone[0,1]/CONTENT/HeroSkillPanel/bottomBg/btnEquip");                                           //装备
    },
    _skill() {
        return this._study() || this._forget();
    },

    _dblclick() {
        return !1,
        helper.click('PopLayer/UserInfoMainPanel/CONTENT/UserInfoMainPanel/contentNode/towerNode/skinNode/DetailNode/nowUseBtn')     //更换皮肤
    },

    _defaultDblClick() {
        return this._march() || this._skill() || this._dblclick();
    },

    _toggleScene() {
        return helper.cleanup(), 
        helper.click("MainUIWrapper/NMainUI[0,1]/Bottom/btnNode/btn_World") ||                                                        //切换世界
        helper.click("WorldMapUIWrapper/NWorldMapUI/bottomNode/btn_Home");                                                            //切换主城
    },
    _fastAlliance() {
        return !1,
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnAlliance/AssemblyMailTipsNode/prefabAssemblyMailTips") ||
        helper.click("MainUIWrapper/NMainUI[0,1]/RightBottom/btnAlliance/fastAllianceHelp/fastAllianceHelpBtn");
    },
    _defaultAction() {
        return !1,
        helper.click("PopLayer/NBattleMain/ui/BattlePanel/button")||                                                                   //出征
        helper.click("TipsLayer/ConfirmPanel/New Layout[0,1]/button_yes") ||                                                           //确认提示
        helper.click("PopLayer/UIFrameNone/CONTENT/prefabItemNumSelect/New Node/buyButton") ||                                         //购买道具(金融中心购买1)
        helper.click("PopLayer/ActivityItemNumSelect/New Layout[0,1]/New Node/buyButton") ||                                           //购买道具(金融中心购买2)
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/useBtn") ||                                                 //使用道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/gotoBtn1") ||                                               //使用道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/2个按钮/composeBtn") ||                                      //合成道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/3个按钮/composeBtn") ||                                      //合成道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/4个按钮/composeBtn") |                                       //合成道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/2个按钮/gotoBtn2") ||                                        //使用道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/3个按钮/gotoBtn") ||                                         //使用道具
        helper.click("PopLayer/BagPanel/CONTENT/BagPanel/bottomBg/selItemD/4个按钮/gotoBtn") ||                                         //使用道具
        helper.click("PopLayer/UIFrameNone/CONTENT/ItemSelectRewardPanel/useBtn") ||                                                    //确定道具
        helper.click('PopLayer/UIFrameNone/CONTENT/RadarTaskPrefab/bg_1/2nd_bg_3/BtnBuild')                                             //雷达前往
//        helper.click("PopLayer/UIFrameNone/CONTENT/prefabMonsterSearchNew/bg_1/MonsterSearch/btnFix") ||                              //搜索怪物
//        helper.click("PopLayer/WorldBossAppearTipPanel/New Node/2nd_bg_3/BtnNode/searchBtn") ||                                       //搜索元帅
//        helper.click("PopLayer/UIFrameNone/CONTENT/AllianceSciencePopup/New Node[0,1]/buyButton") ||                                  //捐献科技
//        helper.click("PopLayer/UIFrameNone/CONTENT/AllianceBuildingPanel/mainNode/New Node[0,1]/coinBtn") ||                          //捐献堡垒  
//        helper.click("PopLayer/UIFrameDialog/BG/CONTENT/WorldSiteUpgradePopup/bg_build_2/btnGold/buyButton") ||                       //捐献遗迹
//        helper.click("PopLayer/UIFrameNone/CONTENT/AllianceHelpPanel_New2/bottomNode/btnAllHelp") ||                                  //联盟帮助
//        helper.click("PopLayer/AllianceGiftPanel/CONTENT/AllianceGiftPanel/bottomBg/nomalNode/composeBtn") ||                         //一键领取(普通礼物)  
//        helper.click("PopLayer/AllianceGiftPanel/CONTENT/AllianceGiftPanel/bottomBg/rareResaveNode/composeBtn") ||                    //领取10个(稀有礼物)
//        helper.click("PopLayer/AllianceGiftPanel/CONTENT/AllianceGiftPanel/growNode/New ScrollView/view/content/Cell/btnReceive") ||  //领取单个(稀有礼物)
//        helper.click("PopLayer/AdventureSweepRewardPanel/buyButton") ||                                                               //远征领取
    },

    default(type) {
        return !1,
        "space" == type ? this._defaultDblClick() || this._fastAlliance() || this._defaultAction() :
        "enter" == type ? this._defaultDblClick() || this._toggleScene() || this._defaultAction() :
        "dblclick" == type ? this._defaultDblClick() : undefined;
    }
}


//-------------------------------------------------------------------------------------------------
//游戏助手扩展功能
helper.ext = {
    openAllianceBuild() {
        __require("AllianceRecordMainPanel").default.prototype.clickRecord({target:{name:"4"}})
    },

    //快速打开基地皮肤功能
    openPlayerSkill() {
        var a = new(__require("NWorldCityPopup").default);
        a.cityInfo = {pid: UserData._uid};
        a.onSkillAllClick();
        delete a;
    },

    //直达宝藏商店
    openTreasureShop() {
        var m = __require("TreasureMapMsgListPanel").default.prototype
        m._onShow || (m._onShow = m.onShow)
        m.onShow = function(t) {
            m.onShow = m._onShow
            this.getlistData(3), this.onShow(t), this.topToggles[1].check(), this.worldToggles[1].check()
        }
        helper.openUI("TreasureMapMsgListPanel")
    },

    //卸除采集技能
    async forgetGatherSkills() {
        /*
        skillId:
        21202-稀有金矿采集      20202-普通金矿采集
        21203-稀有石油采集      20203-普通石油采集
        21204-稀有粮食采集      20204-普通粮食采集
        21205-稀有野外采集      20205-普通粮食采集
        */
//        var a = find("PopLayer").getComponentInChildren("HeroDetailPopupHeroNewSecondEdition");
        var a = find("PopLayer/UIFrameNone/CONTENT/HeroDetailPopupNew").getComponent("HeroDetailPopupNew"), i
        if (a) {
            while ((i = a._data._secondSkillList.findIndex(e=>[21205,21204,21203,21202,20205,20204,20203,20202].includes(e.skillId))) >= 0) {
                await send(RequestId.FORGET_HERO_SKILL, {heroId:a._data.Id, index:i, isBuffSlot:!1, skillsIndex:2})
            }
            a.onSkillIndexChange(null, "1");  //切回技能组1 
        }
    },

    //安装采集技能
    async studyGatherSkills(n) {
        /*
        skillId: xxxxxyy结构：
        xxxxx:
        25232-稀有金矿采集      25032-普通金矿采集
        25233-稀有石油采集      25033-普通石油采集
        25234-稀有粮食采集      25034-普通粮食采集
        25235-稀有野外采集      25035-普通粮食采集
        yy:
        01-一级  02-二级 类推
        */
        function _map(id) {
            var m = new (__require("HeroSkillPanel").default); m.updateSkillPool()
            var e = m._skillPool[4].find(e=>parseInt(e._data.id/100) == id)
            delete m
            return e
        }

        var s = [[25235,25234,25035,25034], [25235,25233,25035,25033], [25235,25232,25035,25032]][n]
        var a = find("PopLayer/UIFrameNone/CONTENT/HeroDetailPopupNew").getComponent("HeroDetailPopupNew")
        if (a) {
            for(n=0; n<4; n++) {
                var i, d = _map(s[n]), d = d && d._data
                if (d) {
                    if (a._data._secondSkillList.find(e=>e.skillId == d.para1)) continue           //已安装
                    if ((i = a._data._secondSkillList.findIndex(e=>e.skillId == 0)) < 0) continue  //查找空槽
                    await send(RequestId.STUDY_HERO_SKILL, {heroId:a._data.Id, index:i, itemId:d.id, isBuffSlot:!1, skillsIndex:2})
                }
            }
            a.onSkillIndexChange(null, "2") //切到技能组2
        }
    },

    //开启/关闭世界地图泡泡按钮
    toggleBubble() {
        var m = __require("NWorldMapUIComponent").default.prototype 
        m._onFMessage_WorldMapViewportChange || (
            m._onFMessage_WorldMapViewportChange = m.onFMessage_WorldMapViewportChange,
            m.onFMessage_WorldMapViewportChange = function(e){return UserData.FunctionOn("home_mark_bubble_display") || (e.data.homeInViewport = !0), this._onFMessage_WorldMapViewportChange(e)}
        ) 
        UserData._Switchs["king_mark_bubble_display"] = UserData._Switchs["home_mark_bubble_display"] = !(this.hideBubble = !this.hideBubble)

//        var c = find("WorldMapUIWrapper/NWorldMapUI").getComponent("NWorldMapUIComponent")
        var a = find("Canvas/NWorldMap", cc.director._scene)
        a && (a = a.getComponent("NWorldMapComponent"))
        a && a.checkHomeInViewport()
    },

    //快速联盟帮助
    async _autoFastHelp() {
        var t = find("MainUIWrapper/NMainUI/RightBottom/btnAlliance/fastAllianceHelp").getComponent("FastAllianceHelp")
        if (t.fastAllianceHelpBtn.active) {
            t.fastAllianceHelpBtn.active = !1
            var o = await send(RequestId.HELP_ALL_ALLIANCE_MEMBERS, {type: 4})
            o && (
                UserData.Alliance.UpdateAllianceHelpCountAndHonor(o),
                UserData.Alliance.DeleteAllAllianceHelpData(),
                __require("EventTool").emit(__require("EventId").EventId.AllianceHelpUpdate)
            )
        }
    }, 

    //开启/关闭快速联盟帮助
    toggleFastHelp() {
        var node = find("MainUIWrapper/NMainUI/RightBottom/btnAlliance/fastAllianceHelp")
        this.fast_help_enabled = !this.fast_help_enabled
        if (this.fast_help_enabled) {
            this.fast_help_timer = setInterval(this._autoFastHelp, 1000, null)
            node.opacity = 0
        }
        else {
            this.fast_help_timer && clearInterval(this.fast_help_timer)
            node.opacity = 255
        }
    },

    //世界地图视口转回基地
    jumpToHome() {
        __require("WorldMapMsgs").send(__require("WorldMapMsgs").Names.WorldMapSetTileView, {
              x: UserData.WorldCoord.x,
              y: UserData.WorldCoord.y,
              s: UserData.ServerId,
              subMap: 0,
              mark: !0
        });       
    },

    //删除基地建筑或士兵
    async deleteHomeItem() {
        var HomeMap = __require("UIManager").default.Instance().HomeMap
    
        async function deleteBuilding(e) {
            //1040-陆军兵营  1050-空军兵营  1100-海军兵营
            if (e && e.BuildingData && [1040, 1050, 1100].includes(e.BuildingData.Data.group)) {
                var o = await send(RequestId.DELETE_BUILDING, {id: e.BuildingData.Id})
                o && (
                    UserData.DeleteBuilding(o.building), 
                    HomeMap.removeBuildingFromMap(o.building.id)
                )
            }
        }
    
        async function deleteArmy(e) {
            if (e && e.ArmyData && e.ArmyData.Id) {
                var o = await send(RequestId.DELETE_ARMY, {id: e.ArmyData.Id})
            }
        }
    
        var a = HomeMap.BuildingNode.getComponentsInChildren("BaseItem")
        var e = a && a.find(e=>e.Holding)
        "BuildingItem" == e.node.name && deleteBuilding(e) 
        "ArmyItem" == e.node.name && deleteArmy(e)
    },

    //打开获取纯彩晶碟页面
    openGetDishPanel() {
        helper.openUI("GetItemPanel", {itemid:324001, needNum:1000000, isNeedTip:!0, scienceGet:!0})
    }
}


//-------------------------------------------------------------------------------------------------
//对话窗口（所有高级功能的设置均打开此对话框）
helper.dialog = {
    _init(e) {
        if (!this.style) {
            this.style = ".helper-dialog-container{position: fixed;top: 0;left: 0;z-index: 9999;width: 100%;height: 100%;}.helper-dialog-box{position: absolute;display: block;border-radius: 8px;"+
                "left: 50%;top: 50%;z-index: 10001;-webkit-transform: translate(-50%, -50%);-ms-transform: translate(-50%, -50%);-o-transform: translate(-50%, -50%);-moz-transform: translate(-50%, -50%);"+
                "transform: translate(-50%, -50%);background-color: #fff;}.helper-dialog-mark{position: absolute;top: 0;left: 0;z-index: 9999;background-color: rgba(0, 0, 0, 0.5);width: 100%;height: 100%;}";
            var a = document.createElement("style")
            a.innerText = this.style  
            document.head.appendChild(a)
        }

        var c = document.createElement('div')
          , b = document.createElement('div')
          , i = document.createElement('iframe')
          , x = document.createElement('span')
          , m = document.createElement('div')

        c.id = "helper-dialog-container"
        c.setAttribute("class", c.id)

        b.setAttribute("class", "helper-dialog-box")
        b.style.display = "block"
        b.style.height = e.height+"px"

        i.width = e.width
        i.height = e.height
        i.name = e.name
        i.frameBorder = "0"
        
        x.innerText = "×"
        x.style = "display: inline-block; color: #999; font-size: 22px; cursor: pointer; position:absolute; top:2%; right:3%;-moz-user-select:none; -webkit-user-select:none; user-select:none;"
        m.setAttribute("class", "helper-dialog-mark")

        x.onclick = ()=>{helper.dialog.close()}
        m.onclick = x.onclick;

        b.appendChild(i)
        b.appendChild(x)
        c.appendChild(b)
        c.appendChild(m)

        this.container = document.body.appendChild(c)
        this.iframe = this.container.getElementsByTagName('iframe')[0]
        this.onclose = e.onclose
    },

    _open(e) {
        this._init(e);
        this.iframe.contentWindow.document.write(e.html);
        this.iframe.contentWindow.oncontextmenu = (e)=>{parent.helper.dispatch(e);}
        this.iframe.contentWindow.onkeydown = (e)=>{parent.helper.dispatch(e);}
        this.iframe.contentWindow.onmouseup = (e)=>{parent.helper.dispatch(e);}
    },

    open(e) {
        !this.iframe ? this._open(e) : this.iframe.name != e.frameName ? (this.close(), this.open(e)) : !1;
        return this.iframe;
    },

    close() {
        this.onclose && this.onclose();
        this.container || (this.container = document.getElementById("helper-dialog-container"));
        this.container && (document.body.removeChild(this.container), this.container = null, this.iframe = null);
    },

    get opened() {
        return document.getElementById("helper-dialog-container");
    }
}


//-------------------------------------------------------------------------------------------------
//出征模型
helper.battle = {
    mutex: new Mutex,

    backup() {
        var a, m=[], context = {};
        a = __require("DataCenter").DATA.CurBattleData
        a && (context.CurBattleData = Object.assign({}, a), a.Attacker={}, a.Defender={}, a.defenders=[], a.otherData={})
    
        a = __require("NBattleModel").NBattleModel.instance
        a && (context.NBattleModel = Object.assign({}, a), a.attackerHeros=[], a.attackerTraps=[], a.attackers=[], a.defenders=[])

        a = __require("NBattleDisplayObjectFacade")
        a && (context.allArmys = a.allArmys, a.allArmys = new Map())

        a = __require("GameTools").default
        a && (context.getAllMyMarches = a.getAllMyMarches, a.getAllMyMarches = ()=>{return []})

        a = __require("UIManager").default.Instance()
        a && a.OpenUI && (context.OpenUI = a.OpenUI, a.OpenUI = ()=>{})
        a && a.CloseUI && (context.CloseUI = a.CloseUI, a.CloseUI = ()=>{})
    
        a = __require("EventCenter").EVENT
        a && (context.emit = a.emit, a.emit = ()=>{})

        a = __require("NBattleMsgs")
        a && (context.NBattleMsgs = {send: a.send}, a.send = ()=>{})

        a = __require("MvcMsgs")
        a && (context.MvcMsgs = {send: a.send}, a.send = ()=>{})

        return context
    },
    
    restore(context) {
        context.CurBattleData && Object.assign(__require("DataCenter").DATA.CurBattleData, context.CurBattleData)
        context.NBattleModel && Object.assign(__require("NBattleModel").NBattleModel.instance, context.NBattleModel)
        context.allArmys && (__require("NBattleDisplayObjectFacade").allArmys = context.allArmys)
        
        context.getAllMyMarches && (__require("GameTools").default.getAllMyMarches = context.getAllMyMarches)
        context.OpenUI && (__require("UIManager").default.Instance().OpenUI = context.OpenUI)
        context.CloseUI && (__require("UIManager").default.Instance().CloseUI = context.CloseUI)
        context.emit && (__require("EventCenter").EVENT.emit = context.emit)

        context.NBattleMsgs && context.NBattleMsgs.send && (__require("NBattleMsgs").send = context.NBattleMsgs.send)
        context.MvcMsgs && context.MvcMsgs.send && (__require("MvcMsgs").send = context.MvcMsgs.send)
    },   

    acquire(time) {
        return this.mutex.acquire(time)? this.backup() : null
    },
    
    release(context) {
        return this.restore(context), this.mutex.release();
    },

    mechaOk(mechaId) {
        var MechaController = __require("MechaController").MechaController.getInstance()
          , MechaState = __require("MechaController").MechaState;
        return (MechaController.getMechaStateByMecha(MechaController.getMyMechaList(mechaId)[0]) == MechaState.CanFight)
    },

    //设置英雄士兵
    setup(preset, maxCount) {
        var NBattlePositionBiz = __require("NBattlePositionBiz").NBattlePositionBiz
          , NBattleModel = __require("NBattleModel").NBattleModel.instance
          , CurBattleData = __require("DataCenter").DATA.CurBattleData;

        maxCount || (maxCount = 9999)
        CurBattleData.Attacker.armys || (CurBattleData.Attacker.armys=[])

        //初始化
        NBattleModel.myMaxArmysNum = NBattlePositionBiz.getPositionCount(UserData.Level)

        //单兵
        if (preset || (preset = 0), 0 == preset) {
            var army = CurBattleData.Attacker.armys.sort((d,e)=>{return d.ArmyData.power - e.ArmyData.power})[0];
            if (!army) return !1;

            if (army.battleMechaData) {
                if (!this.mechaOk(army.battleMechaData.mechaId)) return !1;
                NBattleModel.setAtttackmechaId(army.battleMechaData.mechaId);
            }
            else NBattleModel.setAtttackmechaId(-1)
            NBattleModel.createAttackArmyByCount([army]);
        } 
      
        //随机
        if (9 == preset) {
            __require("QuickArmyEnterBtn").default.prototype.onClick();
        }

        //预设
        if (preset >= 1 && preset <= 8 ) {
            var data = UserData.PresetMarchData.getPreMarchByIndex(preset-1)
            if (data) { 
                var panel = Object.assign(new(__require("BattleEmPanel").default), {_PresetMarchNum:preset-1});
                panel.InitPresetMarchHeroAndArmys();
            }
        }
      
        //控制士兵数量
        var n = NBattleModel.attackerArmyCount - maxCount;
        for (var pos=NBattleModel.attackers.length-1; n>0 && pos>=0; pos--) {
            if (NBattleModel.attackers[pos]) {
                while(n>0 && NBattleModel.attackers[pos].length) (NBattleModel.attackers[pos].pop(), n--);
                NBattleModel.attackers[pos].length == 0 && (NBattleModel.attackers[pos] = null);
            }
        }

        return (NBattleModel.attackerArmyCount > 0) 
    },

    //出征--异步返回
    march() {
        return new Promise(resolve => {
            var _send = NET.send;
            NET.send = (e,t,o,a,r,i)=>{_send.call(NET, e,t,o,(e)=>{a&&a.call(o,e), resolve(e.d ? JSON.parse(e.d) : null)},r,i)};
            try {
                setTimeout(resolve, 5000)
                var panel = new(__require("BattleEmPanel").default);
                panel = Object.assign(panel, {titleL:{}, battleStagesNode:{node:{active:false}}});
                panel.StartFight({});
            }
            finally {
                NET.send = _send;
            }
        })
    }
}


//-------------------------------------------------------------------------------------------------
//游戏助手高级功能
helper.pro = {
    capacity: [
        { id: 3001, name: "findPlayer",       text: "查找玩家坐标" },
        { id: 3002, name: "attackMonster",    text: "攻击黑暗敌军" },
        { id: 3003, name: "createAssembly",   text: "自动发起集结" },
        { id: 3004, name: "helpRefugee",      text: "自动拯救难民" },
        { id: 3005, name: "joinAssembly",     text: "自动加入集结" },
        { id: 3006, name: "gatherResource",   text: "自动采集资源" },
        { id: 3007, name: "allianceMecha",    text: "捐打联盟机甲" },
        { id: 3008, name: "fortressItem",     text: "领取遗迹道具" },
        { id: 3009, name: "worldBoss",        text: "攻击战争之源" },
        { id: 3010, name: "avoidAttacked",    text: "免受攻击保护" },
        { id: 3011, name: "fastAttack",       text: "一键快速攻击" },
        { id: 3012, name: "treasureShop",     text: "宝藏商店道具" },
        { id: 3013, name: "airdropActivity",  text: "空投补给活动" },
        { id: 3014, name: "deepseaTreasure",  text: "深海寻宝活动" },
        { id: 3015, name: "dwarfMiner",       text: "矿产大亨活动" },
        { id: 3016, name: "fortressResource", text: "遗迹资源信息" },
        { id: 3017, name: "treasureCar",      text: "宝藏卡车信息" },
        { id: 3018, name: "miscRewards",      text: "自动常规任务" }
    ],
    
    _declare(t) {
        var items = []
        t && this.capacity.forEach(e=>this[e.name] && this[e.name].open && items.push({id:e.id, text:e.text}))
        window.chrome.webview.postMessage({type:"declare", items:items})
    },

    async _enableMap() {
        var m = __require("NWorldMapData")
          , h = __require("NWorldMapAssetLoader")
          , y = __require("NWorldMapController")
          , g = __require("NWorldMapMarchController")
          , C = __require("NWorldMapModel")
          , T = __require("NWorldMapTileController")
          , I = __require("NWorldMapTerritoryController")
    
        //启动地图系统 
        g.default.instance && g.default.instance.model && g.default.instance.model.checkCleanWorldMarch(),
        h.NWorldMapAssetLoader.instance.load(e=>console.log("Enable NWorldMap system."), null),
        m.default.instance.status.worldMapComponent || (m.default.instance.status.worldMapComponent = {checkPosInViewport:()=>!1}),
        y.default.instance.connect(),
        T.default.instance.connect(),
        g.default.instance.connect(),
        C.default.instance.connect(),
        I.default.instance.connect()

        //我的行军信息
        var o = await send(RequestId.GET_ALL_MY_MARCH_INFO,{})
        o && o.marches && o.marches.forEach(e=>g.default.instance.model.worldMarchDataHandler(e))
    },

    async _load() {
        var o = JSON.parse(await getItem("helper-pro") || localStorage.getItem("helper-pro-" + UserData.UID))
        this.date = o && o.date
    },

    _save() {
        //localStorage.setItem("helper-pro-" + UserData.UID, JSON.stringify({date: this.date}))
        setItem("helper-pro", JSON.stringify({date: this.date}))    
    },

    //切日初始化
    _dayInit() {
        for (var e of this.capacity) this[e.name] && this[e.name].dayInit && this[e.name].dayInit()
    },

    _timer() {
        var t = new Date(ServerTime*1000), s = ''+t.getFullYear() + '-' + (t.getMonth()+1) + '-' + t.getDate()
        this.date != s && (this.date = s, this._save(), this._dayInit())
    },

    //登录成功后的初始化
    _init_1() {
        this._load()
        for (var e of this.capacity) if (this[e.name] && this[e.name].init) {
            try {this[e.name].init()} catch(e) {console.log(e)}
        }
        setInterval(()=>this._timer(), 1000)
     },

    //游戏脚本载入成功时的初始化
    _init_0() {
        //阻止屏幕上下冒黑烟
        __require("NWorldRaiseFogCompoennt").default.prototype.addPrefab = ()=>0
    },

    onLoginComplete() {
        UserData.UID && window.chrome.webview.postMessage({type:"login", uid:UserData.UID, sid:UserData.ServerId, name:UserData.UserName})
    },

    _listenLogin() {
        var mc = new (__require("FWSMvc").FMessageConnectionAbstract)
        mc.onFMessage_FIRST_LOGIN_SERVER_COMPLETE = ()=>this.onLoginComplete()
        mc.connect()
    },

    onGameLoaded() {
        this._init_0()
        UserData.UID ? this.onLoginComplete() : this._listenLogin()
    },

    _init() {
        cc.director._scene ? cc.director._scene.once(cc.Node.EventType.CHILD_ADDED, ()=>this.onGameLoaded()) : cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, ()=>this._init()) 
    },

    //高级功能初始化入口，应用会有两次onLoadCompleted事件，执行2次脚本载入初始化
    //第一次脚本载入初始化调取此函数时cc未初始化，第二次cc组件已载入，整个脚本初始化成功
    init() {
        this._declare(!1), this._init()
    },

    enable() {
        this._declare(!0), this._init_1(), this._enableMap()
    },

    open(id) {
        var a = this.capacity.find(e => e.id == id)
        this[a.name] && this[a.name].open && this[a.name].open()
    }
}


//-------------------------------------------------------------------------------------------------
//快捷键及鼠标响应函数
helper.keyHandler = {
    escape: function() { helper.std.close() },
    space:  function() { helper.std.default("space") },
    enter:  function() { helper.std.default("enter") },
    insert: function() { helper.std.joinAssembly() },
    delete: function() { helper.ext.deleteHomeItem() },
    shift:  function() { helper.ext.toggleBubble() },
    tab:    function() { helper.ext.jumpToHome() },

    _a: function() { helper.std.openAlliance(); },
    _b: function() { helper.std.openBag() },
    _d: function() { helper.std.openDaily() },
    _h: function() { helper.std.openHero() },
    _i: function() { helper.std.openUserInfo() },
    _m: function() { helper.std.openMail() },
    _r: function() { helper.std.openRadar() },
    _s: function() { helper.std.openSearch() },
    _t: function() { helper.std.openTask() },

    _0: function() { helper.std.presetList(0) },
    _1: function() { helper.std.presetList(1) },
    _2: function() { helper.std.presetList(2) },
    _3: function() { helper.std.presetList(3) },
    _4: function() { helper.std.presetList(4) },
    _5: function() { helper.std.presetList(5) },
    _6: function() { helper.std.presetList(6) },
    _7: function() { helper.std.presetList(7) },
    _8: function() { helper.std.presetList(8) },
    _9: function() { helper.std.presetList(9) },

    f1: function() { helper.ext.toggleBubble() },
    f2: function() { helper.ext.toggleFastHelp() },

    ctrl_b: function() { helper.ext.openAllianceBuild() },
    ctrl_d: function() { helper.ext.openGetDishPanel() },
    ctrl_s: function() { helper.ext.openPlayerSkill() },
    ctrl_z: function() { helper.ext.openTreasureShop() },
    ctrl_0: function() { helper.ext.forgetGatherSkills() },
    ctrl_1: function() { helper.ext.studyGatherSkills(0) },
    ctrl_2: function() { helper.ext.studyGatherSkills(1) },
    ctrl_3: function() { helper.ext.studyGatherSkills(2) },

    alt_a: function() { helper.pro.attackMonster && helper.pro.attackMonster.open() },
    alt_c: function() { helper.pro.createAssembly && helper.pro.createAssembly.open() },
    alt_f: function() { helper.pro.findPlayer && helper.pro.findPlayer.open() },
    alt_g: function() { helper.pro.gatherResource && helper.pro.gatherResource.open() },
    alt_h: function() { helper.pro.helpRefugee && helper.pro.helpRefugee.open() },
    alt_j: function() { helper.pro.joinAssembly && helper.pro.joinAssembly.open() },
    alt_p: function() { helper.pro.avoidAttacked && helper.pro.avoidAttacked.open() },
    alt_q: function() { helper.pro.fastAttack && helper.pro.fastAttack.open() },
    alt_r: function() { helper.pro.fortressResource && helper.pro.fortressResource.open() },
    alt_s: function() { helper.pro.treasureShop && helper.pro.treasureShop.open() },
    alt_t: function() { helper.pro.treasureCar && helper.pro.treasureCar.open() },

    dispatch : function(e) {
        if ("keydown" == e.type && !helper.dialog.opened) {
            var a = (' ' == e.key ? "space" : '+' == e.key ?  "insert" : '`' == e.key ? '0' : e.key);            // ' ' => space, + => insert, ` => 0
            e.altKey && (a = "alt_" + a), e.ctrlKey && (a = "ctrl_" + a);
            1 == a.length ? a = "_" + a : a = a.toLowerCase();
		    this[a] && this[a](e);
        }
        "keydown" == e.type && "Escape" == e.key && helper.dialog.opened && helper.dialog.close(); 
        window.chrome.webview.postMessage({type:e.type, key:e.key,code:e.code, keycode:e.keyCode, alt:e.altKey, ctrl:e.ctrlKey, shift:e.shiftKey});
    }
}
    
helper.mouseHandler = {
    down: !1,
    mousedown(e) {
        !1 == this.down ? (this.down = !0, setTimeout(function(o){o.down = !1}, 400, this)) : helper.std.default("dblclick") ? e.stopPropagation() : undefined
    },

    dispatch(e) {
        "mousedown" == e.type && 0 == e.button ? this.mousedown(e) : 2 == e.button ? e.stopPropagation() : undefined
        window.chrome.webview.postMessage({type:e.type, button:e.button, x:e.screenX, y:e.screenY, alt:e.altKey, ctrl:e.ctrlKey, shift:e.shiftKey})
    }
}

helper.dispatch = function(e) {
    if (["keydown", "keyup"].includes(e.type)) return helper.keyHandler.dispatch(e)
    if (["mousedown", "mouseup"].includes(e.type)) return helper.mouseHandler.dispatch(e)
    e.preventDefault()
}


//-------------------------------------------------------------------------------------------------
//游戏助手初始化入口
var helper_base_inited
helper_base_inited || (
    window.addEventListener('keydown', (e)=>{helper.dispatch(e)}, !0),
    window.addEventListener('keyup', (e)=>{helper.dispatch(e)}, !0),
    window.addEventListener('mousedown', (e)=>{helper.dispatch(e)}, !0),
    window.addEventListener('mouseup', (e)=>{helper.dispatch(e)}, !0),
    window.addEventListener('contextmenu', (e)=>{helper.dispatch(e)}, !0),
    helper_base_inited = !0
)

var helper_pro_inited
helper_pro_inited || (helper.pro.init(), helper_pro_inited = !0)


console.log("Init helper base function succeed.")
