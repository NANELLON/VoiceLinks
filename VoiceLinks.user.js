// ==UserScript==
// @name        VoiceLinks
// @namespace   Sanya
// @description Makes RJ codes more useful.
// @include     https://boards.4chan.org/*
// @include     http://boards.4chan.org/*
// @version     1.2.0
// @grant       GM_xmlhttpRequest
// @updateURL   https://github.com/Sanyarin/VoiceLinks/raw/master/VoiceLinks.user.js
// @downloadURL https://github.com/Sanyarin/VoiceLinks/raw/master/VoiceLinks.user.js
// @run-at      document-start
// ==/UserScript==

(function(){
  "use strict";
  var Main, Parser, Popup, DLsite, regex;
  
  regex = {
    rj: new RegExp("RJ[0-9]{6}", "gi")
  };
  
  Parser = {
    textnodes: function(elem){ //copied from ExLinks
      var tn = [], ws = /^\s*$/, getTextNodes;
      getTextNodes = function(node) {
        var cn;
        for ( var i = 0, ii = node.childNodes.length; i < ii; i++ )
        {
         cn = node.childNodes[i];
          if(cn.nodeType === 3)
          {
            if(!ws.test(cn.nodeValue))
            {
              tn.push(cn);
            }
          } else
          if(cn.nodeType === 1)
          {
            if(cn.tagName === 'SPAN' || cn.tagName === 'P' || cn.tagName === 'S')
            {
              getTextNodes(cn);
            }
          }
        }
      };
      getTextNodes(elem);
      return tn;
    },
    substringnode: function(text, a, b){
      var e;
      e = document.createTextNode(text.substring(a, b));
      return e;
    },
    wrap: function(rj){
      var e;
      e = document.createElement("a");
      e.classList = "voicelinkunprocessed";
      e.innerHTML = rj;
      e.target = "_blank";
      e.rel = "noreferrer";
      return e;
    },
    linkify: function(elem){
      var posts, post, textnodes, textnode,
          lnode, newnodes, text, match, idx, val;
      posts = elem.querySelectorAll("blockquote");
      for(var i = 0, ii = posts.length; i<ii; i++)
      {
        post = posts[i];
        textnodes = Parser.textnodes(post);
        for(var j = 0, jj = textnodes.length; j<jj; j++)
        {
          idx = [];
          val = [];
          newnodes = [];
          textnode = textnodes[j];
          text = textnode.nodeValue;
          if(text.match(regex.rj)){
            while(match = regex.rj.exec(text))
            {
              idx.push(match.index);
              val.push(match[0]);
            }
            lnode = Parser.wrap(val[0]);
            textnode.parentNode.insertBefore(lnode, textnode.nextSibling);
            if(text.substring(0,idx[0]))
              textnode.nodeValue = text.substring(0,idx[0]);
            else
              textnode.remove();
            for(var k = 1, kk = idx.length; k<kk; k++)
            {
              if(text.substring(idx[k-1]+8, idx[k]))
                newnodes.push(Parser.substringnode(text, idx[k-1]+8, idx[k]));
              newnodes.push(Parser.wrap(val[k]));
            }
            if(text.substring(idx[kk-1]+8)) //checking last bit of textnode text
              newnodes.push(Parser.substringnode(text, idx[kk-1]+8));
            if(newnodes.length > 0){
              lnode.parentNode.insertBefore(newnodes[0], lnode.nextSibling); //inserting first newnode
              for(var l = 1, ll = newnodes.length; l<ll; l++) //inserting the rest
              {
                lnode.parentNode.insertBefore(newnodes[l], newnodes[l-1].nextSibling);
              }
            }
          }
        }
      }
      Parser.process(elem);
    },
    process: function(elem){
      var voicelinks, voicelink, rj;
      voicelinks = elem.querySelectorAll(".voicelinkunprocessed");
      for(var i = 0, ii = voicelinks.length; i<ii; i++)
      {
        voicelink = voicelinks[i];
        rj = voicelink.innerText.toUpperCase();
        voicelink.href = "http://www.dlsite.com/maniax/work/=/product_id/"+rj+".html";
        voicelink.className = "voicelinked";
        voicelink.id = rj;
        voicelink.addEventListener("mouseover", Popup.over);
        voicelink.addEventListener("mouseout", Popup.out);
        voicelink.addEventListener("mousemove", Popup.move);
      }
    },
    rebindevent: function(elem){
      var voicelinks, voicelink;
      if(elem.nodeName === "A"){
        elem.addEventListener("mouseover", Popup.over);
        elem.addEventListener("mouseout", Popup.out);
        elem.addEventListener("mousemove", Popup.move);
      }
      else{
        voicelinks = elem.querySelectorAll(".voicelinked");
        for(var i = 0, ii = voicelinks.length; i<ii; i++)
        {
          voicelink = voicelinks[i];
          voicelink.addEventListener("mouseover", Popup.over);
          voicelink.addEventListener("mouseout", Popup.out);
          voicelink.addEventListener("mousemove", Popup.move);
        }
      }
    }
  };

  DLsite = {
    parser: function(dom, popup, rj){
      var work_name, table_outline, row, row_text, data, spec_list, work_date_ana,
          work_info = {};
      work_info.rj = rj;
      work_info.img = dom.querySelector("div#work_visual").style["background-image"].slice(7, -2);
      work_name = dom.querySelector("h1#work_name").childNodes[1];
      work_info.title = work_name.childNodes[work_name.childNodes.length - 1].nodeValue;
      work_info.circle = dom.querySelector("span.maker_name").innerText;
      table_outline = dom.querySelector("table#work_outline");
      for(var i = 0, ii = table_outline.rows.length; i<ii; i++)
      {
        row = table_outline.rows[i];
        row_text = row.innerText;
        data = row.cells[1].innerText;
        switch(true){
          case (row_text.includes("販売日")):
            work_info.date = data;
            break;
          case (row_text.includes("年齢指定")):
            work_info.rating = data;
            break;
          case (row_text.includes("ジャンル")):
            work_info.tags = data;
            break;
          default:
            break;
        }
      }
      spec_list = dom.querySelectorAll(".work_spec_list dd")[1].firstChild.nodeValue;
      if(spec_list.includes("総計"))
        work_info.filesize = spec_list.replace("総計", "").trim();
      else
        work_info.filesize = spec_list.substring(spec_list.lastIndexOf("/")+1, spec_list.lastIndexOf("(")).trim();
      work_date_ana = dom.querySelector("p#work_date_ana");
      if(work_date_ana)
        work_info.date_announce = work_date_ana.childNodes[2].innerText;
      Popup.filldiv(popup, work_info);
    },
    request: function(popup, rj){
      var url = "http://www.dlsite.com/maniax/work/=/product_id/"+rj+".html";
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: {
        "User-Agent": "Mozilla/49.0.1",
        "Accept": "text/xml"
        },
        onload: function(resp){
          if(resp.readyState === 4 && resp.status === 200){
            var dom = new DOMParser().parseFromString(resp.responseText, "text/html");
            DLsite.parser(dom, popup, rj);
          }
          else if(resp.readyState === 4 && resp.status === 404)
            DLsite.request_announce(popup, rj);
        }
      });
    },
    request_announce: function(popup, rj){
      var url = "http://www.dlsite.com/maniax/announce/=/product_id/"+rj+".html";
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: {
        "User-Agent": "Mozilla/49.0.1",
        "Accept": "text/xml"
        },
        onload: function(resp){
          if(resp.readyState === 4 && resp.status === 200){
            var dom = new DOMParser().parseFromString(resp.responseText, "text/html");
            DLsite.parser(dom, popup, rj);
          }
          else if(resp.readyState === 4 && resp.status === 404)
            Popup.filldiv(popup, {error: 404});
        }
      });
    }
  };

  Popup = {
    makediv : function(rj){
      var div;
      div = document.createElement("div");
      div.className = "voicepopup post reply init";
      div.id = "voice-" + rj;
      div.setAttribute("style", "display: none !important");
      document.body.appendChild(div);
      DLsite.request(div, rj);
    },
    filldiv: function(div, work_info){
      var html;
      if(work_info.error)
        div.innerHTML = "<div class='error'>Work not found.</span>";
      else
      {
        html = [
        "<img src = 'http://"+work_info.img+"'></img>",
        "<div class = 'voice-title'>"+work_info.title+"</div>",
        "<div class = 'rjcode'>["+work_info.rj+"]</div>",
        "<br>",
        "Circle: <a>"+work_info.circle+"</a>",
        "<br>"]
        if(work_info.date)
          html = html.concat(["Release: <a>"+work_info.date+"</a>",
                              "<br>"]);
        else if(work_info.date_announce)
          html = html.concat(["Scheduled Release: <a>"+work_info.date_announce+"</a>",
                              "<br>"]);
        html = html.concat(["Age Rating: <a>"+work_info.rating+"</a>",
                            "<br>",
                            "Tags: "+work_info.tags]);
        if(work_info.filesize)
          html = html.concat(["<br>",
                              "File Size: "+work_info.filesize]); 
        div.innerHTML = html.join("");
      }
      if(div.className.includes("init")){
        var style;
        div.className = div.className.replace("init", "");
        style = div.getAttribute("style");
        style = style.replace("none", "table");
        div.setAttribute("style", style);
      }
    },
    over: function(ev){
      var rj, popup, style;
      rj = ev.target.innerText.toUpperCase();
      popup = document.querySelector("div#voice-"+rj);
      if(popup){
        style = popup.getAttribute("style");
        style = style.replace("none", "table");
        popup.setAttribute("style", style);
      } else {
        Popup.makediv(rj);
      }
    },
    out: function(ev){
      var rj, popup, style;
      rj = ev.target.innerText.toUpperCase();
      popup = document.querySelector("div#voice-"+rj);
      if(popup){
        if(popup.className.includes("init"))
          popup.className = popup.className.replace("init", "");
        style = popup.getAttribute("style");
        style = style.replace("table", "none");
        popup.setAttribute("style", style);
      }
    },
    move: function(ev){
      var rj, popup, style;
      rj = ev.target.innerText.toUpperCase();
      popup = document.querySelector("div#voice-"+rj);
      if(popup){
        if(popup.offsetWidth + ev.clientX + 10 < window.innerWidth - 10)
        {
          popup.style.left = (ev.clientX + 10) + "px";
        } else {
          popup.style.left = (window.innerWidth - popup.offsetWidth - 10) + "px";
        }
        if(popup.offsetHeight + ev.clientY + 20 > window.innerHeight)
        {
          popup.style.top = (ev.clientY - popup.offsetHeight - 8) +"px";
        } else {
          popup.style.top = (ev.clientY + 20) + "px";
        }
      }
    }
  };

  Main = {
    observer: function(m){
      var nodes, node, post;
      for(var i = 0, ii = m.length; i<ii; i++)
      {
        nodes = m[i].addedNodes;
        for(var j = 0, jj = nodes.length; j<jj; j++)
        {
          node = nodes[j];
          if(node.nodeName === "DIV"){
            if(node.classList.contains("postContainer"))
              Parser.linkify(node);
            if(node.classList.contains("inline") || node.classList.contains("inlined"))
              Parser.rebindevent(node);
          }
          else if(node.nodeName === "A" && node.classList.contains("voicelinked"))
            Parser.rebindevent(node);
        }
      }
    },
    ready: function(){
      var css, style, observer;
      css = "data:text/css;base64,LnZvaWNlcG9wdXB7DQogICAgbWluLXdpZHRoOiA3MCUgIWltcG9ydGFudDsNCiAgICBtYXgtd2lkdGg6IDgwJSAhaW1wb3J0YW50Ow0KICAgIHBvc2l0aW9uOiBmaXhlZCAhaW1wb3J0YW50Ow0KICAgIGxpbmUtaGVpZ2h0OiAxLjRlbTsNCiAgICBmb250LXNpemU6IDEuMWVtOw0KICAgIG1hcmdpbi1ib3R0b206IDEwcHg7DQp9DQoNCi52b2ljZXBvcHVwIGltZ3sNCiAgICBmbG9hdDogbGVmdDsNCiAgICB3aWR0aDogMjcwcHg7DQogICAgaGVpZ2h0OiBhdXRvOw0KICAgIG1hcmdpbjogM3B4IDE1cHggM3B4IDNweDsNCn0NCg0KLnZvaWNlLXRpdGxlew0KICAgIGZvbnQtc2l6ZTogMS40ZW07DQogICAgZm9udC13ZWlnaHQ6IGJvbGQ7DQogICAgdGV4dC1hbGlnbjogY2VudGVyOw0KICAgIG1hcmdpbjogNXB4IDEwcHggMCAwOw0KICAgIGRpc3BsYXk6IGJsb2NrOw0KfQ0KDQoucmpjb2Rlew0KICAgIHRleHQtYWxpZ246IGNlbnRlcjsNCiAgICBmb250LXNpemU6IDEuMmVtOw0KICAgIGZvbnQtc3R5bGU6IGl0YWxpYzsNCiAgICBvcGFjaXR5OiAwLjM7DQp9DQoNCi5lcnJvcnsNCiAgICBoZWlnaHQ6IDIxMHB4Ow0KICAgIGxpbmUtaGVpZ2h0OiAyMTBweDsNCiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7DQp9";
      style = document.createElement("link");
      style.rel="stylesheet";
      style.type="text/css";
      style.href=css;
      document.head.appendChild(style);
      Parser.linkify(document);
      document.removeEventListener("DOMContentLoaded", Main.ready);
      observer = new MutationObserver(Main.observer);
      observer.observe(document.body, {childList: true, subtree: true});
    },
    init: function(){
      document.addEventListener("DOMContentLoaded", Main.ready);
    }
  };

  Main.init();
})();