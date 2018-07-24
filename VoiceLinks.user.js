// ==UserScript==
// @name        VoiceLinks
// @namespace   Sanya
// @description Makes RJ codes more useful.
// @include     https://boards.4chan.org/*
// @include     http://boards.4chan.org/*
// @version     1.2.10
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @updateURL   https://github.com/Sanyarin/VoiceLinks/raw/master/VoiceLinks.user.js
// @downloadURL https://github.com/Sanyarin/VoiceLinks/raw/master/VoiceLinks.user.js
// @run-at      document-start
// ==/UserScript==

(function(){
  "use strict";
  var Main, Parser, Popup, DLsite, regex;
  
  regex = {
    rj: new RegExp("R[JE][0-9]{6}", "gi")
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
          newnodes, text, match, idx, val;
      posts = elem.querySelectorAll("blockquote");
      for(var i = 0, ii = posts.length; i<ii; i++)
      {
        post = posts[i];
        textnodes = Parser.textnodes(post);
        for(var j = 0, jj = textnodes.length; j<jj; j++)
        {
          idx = [];    //store regex match index
          val = [];    //store regex match value
          newnodes = [];
          textnode = textnodes[j];
          text = textnode.nodeValue;

          if(text.match(regex.rj)){

            while(match = regex.rj.exec(text))
            {
              idx.push(match.index);
              val.push(match[0]);
            }

            textnode.nodeValue = text.substring(0,idx[0]);

            for(var k = 0, kk = idx.length; k<kk; k++) //push nodes to be inserted after textnode
            {
              newnodes.push(Parser.wrap(val[k]));
              if(text.substring(idx[k]+8, idx[k+1]))
                newnodes.push(Parser.substringnode(text, idx[k]+8, idx[k+1]));
            }

            if(newnodes.length){
              textnode.parentNode.insertBefore(newnodes[0], textnode.nextSibling); //inserting first newnode
              for(var l = 1, ll = newnodes.length; l<ll; l++) //inserting the rest
              {
                textnode.parentNode.insertBefore(newnodes[l], newnodes[l-1].nextSibling);
              }
            }

            if(!textnode.nodeValue)
              textnode.remove();

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
        rj = voicelink.innerText.toUpperCase().replace("E", "J");
        voicelink.href = "http://www.dlsite.com/maniax/work/=/product_id/"+rj+".html";
        voicelink.className = "voicelinked";
        voicelink.setAttribute("rjcode", rj.toUpperCase());
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
    },
    replace_announce: function(rj){
      var voicelinks, voicelink;
      voicelinks = document.querySelectorAll("[rjcode="+rj+"]");
      for(var i = 0 , ii = voicelinks.length; i<ii; i++)
      {
        voicelink = voicelinks[i];
        voicelink.href = "http://www.dlsite.com/maniax/announce/=/product_id/"+rj+".html";
      }
    }
  };

  DLsite = {
    parser: function(dom, rj){
      var work_name, table_outline, row, row_header, row_data, spec_list, work_date_ana,
          work_info = {}, rj_group;
      work_info.rj = rj;
      if(rj.slice(5) == "000")
        rj_group = rj;
      else{
        rj_group = (parseInt(rj.slice(2,5))+1).toString()  + "000";
        rj_group = "RJ" + ("000000"+rj_group).substring(rj_group.length);
      }
      work_info.img = "img.dlsite.jp/modpub/images2/work/doujin/"+rj_group+"/"+rj+"_img_main.jpg";
      work_info.title = dom.getElementById("work_name").innerText;
      work_info.circle = dom.querySelector("span.maker_name").innerText;
      table_outline = dom.querySelector("table#work_outline");
      for(var i = 0, ii = table_outline.rows.length; i<ii; i++)
      {
        row = table_outline.rows[i];
        row_header = row.cells[0].innerText;
        row_data = row.cells[1];
        switch(true){
          case (row_header.includes("販売日")):
            work_info.date = row_data.innerText;
            break;
          case (row_header.includes("年齢指定")):
            work_info.rating = row_data.innerText;
            break;
          case (row_header.includes("ジャンル")):
            var tag_nodes = row_data.querySelectorAll("a");
            work_info.tags = [...tag_nodes].map(a => {return a.innerText});
            break;
          case (row_header.includes("声優")):
            work_info.cv = row_data.innerText; 
            break;
          case (row_header.includes("ファイル容量")):
            work_info.filesize = row_data.innerText.replace("総計","").trim();
            break;
          default:
            break;
        }
      }
      work_date_ana = dom.querySelector("strong.work_date_ana");
      if(work_date_ana){
        work_info.date_announce = work_date_ana.innerText;
        work_info.img = "img.dlsite.jp/modpub/images2/ana/doujin/"+rj_group+"/"+rj+"_ana_img_main.jpg"
      }
      Popup.filldiv(work_info);
    },
    request: function(rj){
      var url = "http://www.dlsite.com/maniax/work/=/product_id/"+rj+".html";
      (typeof GM !== "undefined" && GM !== null ? GM.xmlHttpRequest : GM_xmlhttpRequest)({
        method: "GET",
        url: url,
        headers: {
        "User-Agent": "Mozilla/49.0.1",
        "Accept": "text/xml"
        },
        onload: function(resp){
          if(resp.readyState === 4 && resp.status === 200){
            var dom = new DOMParser().parseFromString(resp.responseText, "text/html");
            DLsite.parser(dom, rj);
          }
          else if(resp.readyState === 4 && resp.status === 404)
            DLsite.request_announce(rj);
        }
      });
    },
    request_announce: function(rj){
      var url = "http://www.dlsite.com/maniax/announce/=/product_id/"+rj+".html";
      (typeof GM !== "undefined" && GM !== null ? GM.xmlHttpRequest : GM_xmlhttpRequest)({
        method: "GET",
        url: url,
        headers: {
        "User-Agent": "Mozilla/49.0.1",
        "Accept": "text/xml"
        },
        onload: function(resp){
          if(resp.readyState === 4 && resp.status === 200){
            var dom = new DOMParser().parseFromString(resp.responseText, "text/html");
            Parser.replace_announce(rj);
            DLsite.parser(dom, rj);
          }
          else if(resp.readyState === 4 && resp.status === 404)
            Popup.filldiv({rj: rj, error: 404});
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
      DLsite.request(rj);
    },
    filldiv: function(work_info){
      var html, div;
      div = document.querySelector("div#voice-"+work_info.rj);
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
                            "<br>"]);

        if(work_info.cv)
          html = html.concat(["CV: <a>"+work_info.cv+"</a>",
                              "<br>"]);

        html = html.concat("Tags: <a>");
        work_info.tags.forEach((tag) => {
          html = html.concat(tag + "\u3000");
        });
        html = html.concat("</a><br>");

        if(work_info.filesize)
          html = html.concat(["File Size: "+work_info.filesize]); 
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
      rj = ev.target.getAttribute("rjcode");
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
      rj = ev.target.getAttribute("rjcode");
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
      rj = ev.target.getAttribute("rjcode");
      popup = document.querySelector("div#voice-"+rj);
      if(popup){
        if(popup.offsetWidth + ev.clientX + 10 < window.innerWidth - 10)
        {
          popup.style.left = (ev.clientX + 10) + "px";
        } else {
          popup.style.left = (window.innerWidth - popup.offsetWidth - 10) + "px";
        }
        if(popup.offsetHeight + ev.clientY + 50 > window.innerHeight)
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
      css = "data:text/css;base64,LnZvaWNlcG9wdXB7DQogICAgbWluLXdpZHRoOiA3MCUgIWltcG9ydGFudDsNCiAgICBtYXgtd2lkdGg6IDgwJSAhaW1wb3J0YW50Ow0KICAgIHBvc2l0aW9uOiBmaXhlZCAhaW1wb3J0YW50Ow0KICAgIGxpbmUtaGVpZ2h0OiAxLjRlbTsNCiAgICBmb250LXNpemU6IDEuMWVtOw0KICAgIG1hcmdpbi1ib3R0b206IDEwcHg7DQogICAgYm94LXNoYWRvdzogMCAwIC4xMjVlbSAwIHJnYmEoMCwwLDAsLjUpOw0KICAgIGJvcmRlci1yYWRpdXM6IDAuNWVtOw0KDQp9DQoNCi52b2ljZXBvcHVwIGltZ3sNCiAgICBmbG9hdDogbGVmdDsNCiAgICB3aWR0aDogMjcwcHg7DQogICAgaGVpZ2h0OiBhdXRvOw0KICAgIG1hcmdpbjogM3B4IDE1cHggM3B4IDNweDsNCn0NCg0KLnZvaWNlLXRpdGxlew0KICAgIGZvbnQtc2l6ZTogMS40ZW07DQogICAgZm9udC13ZWlnaHQ6IGJvbGQ7DQogICAgdGV4dC1hbGlnbjogY2VudGVyOw0KICAgIG1hcmdpbjogNXB4IDEwcHggMCAwOw0KICAgIGRpc3BsYXk6IGJsb2NrOw0KfQ0KDQoucmpjb2Rlew0KICAgIHRleHQtYWxpZ246IGNlbnRlcjsNCiAgICBmb250LXNpemU6IDEuMmVtOw0KICAgIGZvbnQtc3R5bGU6IGl0YWxpYzsNCiAgICBvcGFjaXR5OiAwLjM7DQp9DQoNCi5lcnJvcnsNCiAgICBoZWlnaHQ6IDIxMHB4Ow0KICAgIGxpbmUtaGVpZ2h0OiAyMTBweDsNCiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7DQp9DQo=";
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