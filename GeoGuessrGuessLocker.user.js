// ==UserScript==
// @name         Press L to lock your guess v1.2.
// @namespace    GeoGuessr scripts
// @version      1.2
// @description  Lock in guess when playing GeoGuessr.
// @author       echandler
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @downloadURL  https://github.com/echandler/GeoGuessr-guess-locker/raw/main/GeoGuessrGuessLocker.user.js
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
    .lockAnimation {
	    animation: lockAni 150ms cubic-bezier(0.390, 0.575, 0.565, 1.000) both;
    }

    @keyframes lockAni {
        0% { transform: scale(2.1); }
        40% { transform: scale(0.8); }
        100% { transform: scale(1); }
    }
`);

const mutationCallback = function(mutationsList, observer) {
    for(let mutation of mutationsList) {
        if (mutation.type === "childList") {
            let el = mutation.addedNodes[0];
            if (el && el.tagName === "SCRIPT" && /common.js/.test(el.src)){
                observer.disconnect();

                el.addEventListener("load", function(){
                    unsafeWindow.modify_google_maps_Map();
                    unsafeWindow.modify_google_maps_OverlayView();
                    showLoadMsg();
                });
            }
        }
    }
};

const targetNode = document.head;
const config = { childList: true, subtree: true };

const observer = new MutationObserver(mutationCallback);
observer.observe(targetNode, config);

let clicks = [];

unsafeWindow.modify_google_maps_Map = function(msg){
    let googleMap = google.maps.Map;

    google.maps.Map = function(){
        let map = new googleMap(...arguments);
        let listener = map.addListener;

        map.addListener = function(name, fn){
            let obj = {
                i:  listener.apply(map, arguments)
            };

            if (name === "click"){
                obj.fn = fn;
                clicks.push(obj);
            }

            return obj.i;
        };

        return map;
    };
};

unsafeWindow.modify_google_maps_OverlayView = function () {
    let proto = google.maps.OverlayView.prototype;

    if (proto.___originalSetMap) return;

    proto.___originalSetMap = proto.setMap;

    proto.setMap = newSetMap;
};

let pause = false;

function newSetMap(...args) {

    this.___originalSetMap.apply(this, args);

    if (this.map === null && pause === false){
        document.body.removeEventListener("keypress", this._keypressListener);
        document.body.removeEventListener("mousedown", this._keypressListener);

        if (this.div.lockicon){
            this.div.lockicon.parentElement.removeChild(this.div.lockicon);
        }

        clicks.forEach((clck)=>{
            this.__Map.addListener(clck.fn);
        });

        pause = true;

        setTimeout(function(){
            pause = false;
        }, 1000);
    }

    this.__Map = this.map;

    if (!this._position){
        let int = setInterval(()=>{
            if (!this.position) return;
            this._position = this.position;
            clearInterval(int);
        }, 100);
    }

    this._keypressListener = (e)=>{

        if (e.type === "mousedown" && e.which && e.which != 2) return;
        if (e.key && e.key != "l") return;

       // if (!this._setPosition){
       //     this._setPosition = this.setPosition;
       // }

        this.setPosition = ()=>{};

       // this.div.style.opacity = 0.6;
        if (this.div.lockicon) return;

        let lockicon = document.createElement('div');
        lockicon.style.cssText = `width: 20px; height: 20px;
                              position: absolute;
                              top: -22px;
                              left: 0px;
                              background: url('data:image/png;base64,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');
                              background-size: cover;
                            `;

        this.div.lockicon = lockicon;

        // lastChild doesn't have modified removeElement function.
        this.div.lastChild.appendChild(lockicon);

        this._locked = true;

        clicks.forEach((clck)=>{
            google.maps.event.removeListener(clck.i);
        });

        lockicon.classList.add('lockAnimation');
    };

    document.body.addEventListener("keypress", this._keypressListener);
    document.body.addEventListener("mousedown", this._keypressListener);
};

function showLoadMsg(){
    let msg = document.createElement("div");
    msg.innerText = "Press L to lock, bring on your A game!";
    msg.style.cssText = "position: absolute; top: 10px; left: 10px; transition: 1000ms ease; font-weight: bold;";

    document.body.appendChild(msg);

    setTimeout(function(){
        msg.style.top = "-20px";
        setTimeout(function(){
            msg.parentElement.removeChild(msg);
        }, 1100);
    }, 5000);
}
