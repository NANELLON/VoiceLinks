// ==UserScript==
// @name        VoiceLinks
// @namespace   Sanya
// @description Makes RJ codes more useful.
// @include     *://*/*
// @version     2.1.1
// @grant       GM.xmlHttpRequest
// @grant       GM_xmlhttpRequest
// @updateURL   https://github.com/NANELLON/VoiceLinks/raw/master/VoiceLinks.user.js
// @downloadURL https://github.com/NANELLON/VoiceLinks/raw/master/VoiceLinks.user.js
// @run-at      document-start
// ==/UserScript==

(function () {
  'use strict';
  const RJ_REGEX = new RegExp("R[JE][0-9]{6}", "gi");
  const VOICELINK_CLASS = 'voicelink';
  const RJCODE_ATTRIBUTE = 'rjcode';
  const css = `
      .voicepopup {
          min-width: 600px !important;
          z-index: 50000 !important;
          max-width: 80% !important;
          position: fixed !important;
          line-height: 1.4em;
          font-size: 1.1em;
          margin-bottom: 10px;
          box-shadow: 0 0 .125em 0 rgba(0,0,0,.5);
          border-radius: 0.5em;
          background-color: inherit;
          padding: 10px;
      }

      .voicepopup img {
          width: 270px;
          height: auto;
          margin: 3px 15px 3px 3px;
      }


.voicelink {
    background: #ffffff66;
    color: #333;
}
.voicelink : hover {
    text-decoration: none;
}
    .secondary, .secondary:hover {
        color: #E67E22;
    }

    .missing, .missing:hover {
        color: #7F8C8D;
    }

    .primary, .primary:hover {
        color: #1ABC9C;
    }

    .size-warning, .size-warning:hover {
        color: red;
    }

      .voice-title {
          font-size: 1.4em;
          font-weight: bold;
          text-align: center;
          margin: 5px 10px 0 0;
          display: block;
      }

      .rjcode {
          text-align: center;
          font-size: 1.2em;
          font-style: italic;
          opacity: 0.3;
      }

      .error {
          height: 210px;
          line-height: 210px;
          text-align: center;
      }

      .discord-dark {
          background-color: #36393f;
          color: #dcddde;
          font-size: 0.9375rem;
      }
  `

  function getAdditionalPopupClasses() {
      const hostname = document.location.hostname;
      switch (hostname) {
          case "boards.4chan.org": return "post reply";
          case "discordapp.com": return "discord-dark";
          default: return null;
      }
  }

  function getXmlHttpRequest() {
      return (typeof GM !== "undefined" && GM !== null ? GM.xmlHttpRequest : GM_xmlhttpRequest);
  }

  const Parser = {
      walkNodes: function (elem) {
          const rjNodeTreeWalker = document.createTreeWalker(
              elem,
              NodeFilter.SHOW_TEXT,
              {
                  acceptNode: function (node) {
                      if (node.parentElement.classList.contains(VOICELINK_CLASS))
                          return NodeFilter.FILTER_ACCEPT;
                      if (node.nodeValue.match(RJ_REGEX))
                          return NodeFilter.FILTER_ACCEPT;
                  }
              },
              false,
          );
          while (rjNodeTreeWalker.nextNode()) {
              const node = rjNodeTreeWalker.currentNode;
              if (node.parentElement.classList.contains(VOICELINK_CLASS))
                  Parser.rebindEvents(node.parentElement);
              else
              {
                  Parser.linkify(node);
              }
          }
      },

      wrapRJCode: function (rjCode) {
          var e;
          e = document.createElement("a");
          e.classList = VOICELINK_CLASS;
          e.href = `https://www.dlsite.com/maniax/work/=/product_id/${rjCode}.html`
          e.innerHTML = rjCode;
          e.target = "_blank";
          e.rel = "noreferrer";
          e.classList.add(rjCode);
          e.setAttribute(RJCODE_ATTRIBUTE, rjCode.toUpperCase());
          e.addEventListener("mouseover", Popup.over);
          e.addEventListener("mouseout", Popup.out);
          e.addEventListener("mousemove", Popup.move);
          return e;
      },

      linkify: function (textNode) {
          const nodeOriginalText = textNode.nodeValue;
          const matches = [];

          let match;
          while (match = RJ_REGEX.exec(nodeOriginalText)) {
              matches.push({
                  index: match.index,
                  value: match[0],
              });

              if(globalCodes.indexOf(match[0]) == -1) {
                  globalCodes.push(match[0]);

              // check index status

                  let rjCode = match[0];

                  indexer.request(rjCode, function(status){

                      let primary = status.files[0].alive;
                      let secondary = status.files[1].alive;
                      let dlsiteBytes = status.fileSize * 1024 * 1024;
                      let gotLink = primary || secondary;
                      let hvdbBytes = primary ? status.files[0].size : secondary ? status.files[1].size : 0;
                      let warn = primary && (hvdbBytes / dlsiteBytes) < 0.7;
                      let codes = document.querySelectorAll('.' + rjCode);
                      codes.forEach(function(element){
                          element.classList.add(primary ? 'primary' : secondary ? 'secondary' : 'missing');
                          let warn = primary && (hvdbBytes / dlsiteBytes) < 0.7;
                          if(warn) {
                              element.classList.add('size-warning');
                          }
                      });


                  });

              }
          }

          // Keep text in text node until first RJ code
          textNode.nodeValue = nodeOriginalText.substring(0, matches[0].index);

          // Insert rest of text while linkifying RJ codes
          let prevNode = null;
          for (let i = 0; i < matches.length; ++i) {

              // Insert linkified RJ code
              const rjLinkNode = Parser.wrapRJCode(matches[i].value);
              textNode.parentNode.insertBefore(
                  rjLinkNode,
                  prevNode ? prevNode.nextSibling : textNode.nextSibling,
              );

              // Insert text after if there is any
              let upper;
              if (i === matches.length - 1)
                  upper = undefined;
              else
                  upper = matches[i + 1].index;
              let substring;
              if (substring = nodeOriginalText.substring(matches[i].index + 8, upper)) {
                  const subtextNode = document.createTextNode(substring);
                  textNode.parentNode.insertBefore(
                      subtextNode,
                      rjLinkNode.nextElementSibling,
                  );
                  prevNode = subtextNode;
              }
              else {
                  prevNode = rjLinkNode;
              }
          }
      },

      rebindEvents: function (elem) {
          if (elem.nodeName === "A") {
              elem.addEventListener("mouseover", Popup.over);
              elem.addEventListener("mouseout", Popup.out);
              elem.addEventListener("mousemove", Popup.move);
          }
          else {
              const voicelinks = elem.querySelectorAll("." + VOICELINK_CLASS);
              for (var i = 0, ii = voicelinks.length; i < ii; i++) {
                  const voicelink = voicelinks[i];
                  voicelink.addEventListener("mouseover", Popup.over);
                  voicelink.addEventListener("mouseout", Popup.out);
                  voicelink.addEventListener("mousemove", Popup.move);
              }
          }
      },

  }

  var globalCodes = [];

  const Popup = {
      makePopup: function (e, rjCode) {
          const popup = document.createElement("div");
          popup.className = "voicepopup " + (getAdditionalPopupClasses() || '');
          popup.id = "voice-" + rjCode;
          popup.style = "display: flex";
          document.body.appendChild(popup);
          DLsite.request(rjCode, function (workInfo) {
              if (workInfo === null)
                  popup.innerHTML = "<div class='error'>Work not found.</span>";
              else {

                indexer.request(rjCode, function(status){

                    let primary = status.files[0].alive;
                    let secondary = status.files[1].alive;
                    let dlsiteBytes = status.fileSize * 1024 * 1024;
                    let gotLink = primary || secondary;
                    let hvdbBytes = primary ? status.files[0].size : secondary ? status.files[1].size : 0;
                    let warn = primary && (hvdbBytes / dlsiteBytes) < 0.7;

                  const imgContainer = document.createElement("div")
                  const img = document.createElement("img");
                  img.src = workInfo.img;
                  imgContainer.appendChild(img);

                  let html = `
                      <div>
                          <div class='voice-title'>${workInfo.title}</div>
                          <div class='rjcode'>[${workInfo.rj}]</div>
                          <br />
                          Circle: <a>${workInfo.circle}</a>
                          <br />
                  `;
                  if (workInfo.date)
                      html += `Release: <a>${workInfo.date}</a> <br />`;
                  else if (workInfo.dateAnnounce)
                      html += `Scheduled Release: <a>${workInfo.dateAnnounce}</a> <br />`;

                  html += `Age rating: <a>${workInfo.rating}</a><br />`

                  if (workInfo.cv)
                      html += `CV: <a>${workInfo.cv}</a> <br />`;

                  html += `Tags: <a>`
                  workInfo.tags.forEach(tag => {
                      html += tag + "\u3000";
                  });
                  html += "</a><br />";

                  if (workInfo.filesize)
                      html += `File size: ${workInfo.filesize}<br />`;

                  html += `Link state: ${(gotLink ? Popup.humanFileSize(hvdbBytes) : 'missing') + (warn ? '⚠️️' : '')}<br /> `;

                  html += "</div>"
                  popup.innerHTML = html;

                  popup.insertBefore(imgContainer, popup.childNodes[0]);
                });
              }

              Popup.move(e);
          });
      },
      humanFileSize: function (size) {
        if(!size) return '';
        var i = Math.floor( Math.log(size) / Math.log(1024) );
        return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
      },

      over: function (e) {
          const rjCode = e.target.getAttribute(RJCODE_ATTRIBUTE);
          const popup = document.querySelector("div#voice-" + rjCode);
          if (popup) {
              const style = popup.getAttribute("style").replace("none", "flex");
              popup.setAttribute("style", style);
          }
          else {
              Popup.makePopup(e, rjCode);
          }
      },

      out: function (e) {
          const rjCode = e.target.getAttribute("rjcode");
          const popup = document.querySelector("div#voice-" + rjCode);
          if (popup) {

              const style = popup.getAttribute("style").replace("flex", "none");;
              popup.setAttribute("style", style);
          }
      },

      move: function (e) {
          const rjCode = e.target.getAttribute("rjcode");
          const popup = document.querySelector("div#voice-" + rjCode);
          if (popup) {
              if (popup.offsetWidth + e.clientX + 10 < window.innerWidth - 10) {
                  popup.style.left = (e.clientX + 10) + "px";
              }
              else {
                  popup.style.left = (window.innerWidth - popup.offsetWidth - 10) + "px";
              }

              if (popup.offsetHeight + e.clientY + 50 > window.innerHeight) {
                  popup.style.top = (e.clientY - popup.offsetHeight - 8) + "px";
              }
              else {
                  popup.style.top = (e.clientY + 20) + "px";
              }
          }
      },
  }

  const indexer = {
      request: function (rjCode, callback) {
        const url = `https://api.xn--4qs.club/work/${rjCode}/status`;
        getXmlHttpRequest()({
            method: "GET",
            url,
            onload: function (resp) {
                if (resp.readyState === 4 && resp.status === 200) {
                    const status = JSON.parse(resp.responseText);
                    callback(status);
                }
            },
        });
      }
  }

  const DLsite = {
      parseWorkDOM: function (dom, rj) {
          // workInfo: {
          //     rj: any;
          //     img: string;
          //     title: any;
          //     circle: any;
          //     date: any;
          //     rating: any;
          //     tags: any[];
          //     cv: any;
          //     filesize: any;
          //     dateAnnounce: any;
          // }
          const workInfo = {};
          workInfo.rj = rj;

          let rj_group;
          if (rj.slice(5) == "000")
              rj_group = rj;
          else {
              rj_group = (parseInt(rj.slice(2, 5)) + 1).toString() + "000";
              rj_group = "RJ" + ("000000" + rj_group).substring(rj_group.length);
          }

          workInfo.img = "https://img.dlsite.jp/modpub/images2/work/doujin/" + rj_group + "/" + rj + "_img_main.jpg";
          workInfo.title = dom.getElementById("work_name").innerText;
          workInfo.circle = dom.querySelector("span.maker_name").innerText;

          const table_outline = dom.querySelector("table#work_outline");
          for (var i = 0, ii = table_outline.rows.length; i < ii; i++) {
              const row = table_outline.rows[i];
              const row_header = row.cells[0].innerText;
              const row_data = row.cells[1];
              switch (true) {
                  case (row_header.includes("販売日")):
                      workInfo.date = row_data.innerText;
                      break;
                  case (row_header.includes("年齢指定")):
                      workInfo.rating = row_data.innerText;
                      break;
                  case (row_header.includes("ジャンル")):
                      const tag_nodes = row_data.querySelectorAll("a");
                      workInfo.tags = [...tag_nodes].map(a => { return a.innerText });
                      break;
                  case (row_header.includes("声優")):
                      workInfo.cv = row_data.innerText;
                      break;
                  case (row_header.includes("ファイル容量")):
                      workInfo.filesize = row_data.innerText.replace("総計", "").trim();
                      break;
                  default:
                      break;
              }
          }

          const work_date_ana = dom.querySelector("strong.work_date_ana");
          if (work_date_ana) {
              workInfo.dateAnnounce = work_date_ana.innerText;
              workInfo.img = "https://img.dlsite.jp/modpub/images2/ana/doujin/" + rj_group + "/" + rj + "_ana_img_main.jpg"
          }

          return workInfo;
      },

      request: function (rjCode, callback) {
          const url = `https://www.dlsite.com/maniax/work/=/product_id/${rjCode}.html`;
          getXmlHttpRequest()({
              method: "GET",
              url,
              headers: {
                  "Accept": "text/xml",
                  "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:67.0)"
              },
              onload: function (resp) {
                  if (resp.readyState === 4 && resp.status === 200) {
                      const dom = new DOMParser().parseFromString(resp.responseText, "text/html");
                      const workInfo = DLsite.parseWorkDOM(dom, rjCode);
                      callback(workInfo);
                  }
                  else if (resp.readyState === 4 && resp.status === 404)
                      DLsite.requestAnnounce(rjCode, callback);
              },
          });
      },

      requestAnnounce: function (rjCode, callback) {
          const url = `https://www.dlsite.com/maniax/announce/=/product_id/${rjCode}.html`;
          getXmlHttpRequest()({
              method: "GET",
              url,
              headers: {
                  "Accept": "text/xml",
                  "User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:67.0)"
              },
              onload: function (resp) {
                  if (resp.readyState === 4 && resp.status === 200) {
                      const dom = new DOMParser().parseFromString(resp.responseText, "text/html");
                      const workInfo = DLsite.parseWorkDOM(dom, rjCode);
                      callback(workInfo);
                  }
                  else if (resp.readyState === 4 && resp.status === 404)
                      callback(null);
              },
          });
      },
  }


  document.addEventListener("DOMContentLoaded", function () {
      const style = document.createElement("style");
      style.innerHTML = css;
      document.head.appendChild(style);

      Parser.walkNodes(document.body);

      const observer = new MutationObserver(function (m) {
          for (let i = 0; i < m.length; ++i) {
              let addedNodes = m[i].addedNodes;

              for (let j = 0; j < addedNodes.length; ++j) {
                  Parser.walkNodes(addedNodes[j]);
              }

          }
      });

      document.addEventListener("securitypolicyviolation", function (e) {
          if (e.blockedURI.includes("img.dlsite.jp")) {
              const img = document.querySelector(`img[src="${e.blockedURI}"]`);
              img.remove();
          }
      });

      observer.observe(document.body, { childList: true, subtree: true })
  });
})();
