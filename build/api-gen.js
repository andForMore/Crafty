// Generated by CoffeeScript 1.4.0
(function() {
  var DocBlock, Table, cleanName, createPage, data, dirOut, docCallback, document, fs, marked, parseJS, pendingOperations, processBlock, saveMd, seeBlock, templateName, tracker, triggerBlock, versionString, writeOut,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  marked = require("marked");

  marked.setOptions({
    breaks: false,
    sanitize: false
  });

  fs = require('fs');

  docCallback = null;

  pendingOperations = 0;

  dirOut = 'markdown/';

  templateName = "doc_template.html";

  data = [];

  versionString = "0.0.X";

  writeOut = function(name, html) {
    return fs.writeFile(dirOut + cleanName(name) + '.html', html, function(err) {
      if (err) {
        console.error(err);
      }
      return tracker();
    });
  };

  Table = {
    cats: [],
    comps: [],
    blocks: []
  };

  processBlock = function(block) {
    var c, _i, _len, _ref;
    Table.blocks[block.name] = block;
    if (block.categories.length > 0) {
      _ref = block.categories;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        if (!(Table.cats[c] != null)) {
          Table.cats[c] = [];
        }
        Table.cats[c].push(block);
      }
      if (!Table.comps[block.comp]) {
        Table.comps[block.name] = {
          name: block.name,
          parts: []
        };
      }
      Table.comps[block.name].block = block;
    }
    if (block.comp) {
      if (!Table.comps[block.comp]) {
        Table.comps[block.comp] = {
          name: block.comp,
          parts: []
        };
      }
      return Table.comps[block.comp].parts.push(block);
    }
  };

  DocBlock = (function() {

    function DocBlock() {
      this.processTag = __bind(this.processTag, this);

      this.processLine = __bind(this.processLine, this);
      this.content = [];
      this.categories = [];
      this.comp = null;
      this.see = [];
      this.triggers = [];
      this.name = "";
      this.code = [];
      this.prevTag = null;
    }

    DocBlock.prototype.processLine = function(line) {
      var clean, tag, tagged, value, _ref;
      clean = line.trim().replace(/\/\*\*\@|\*\/|\*/, '');
      if (clean[0] === ' ') {
        clean = clean.substr(1);
      }
      tagged = clean.match(/\@([^\s]*)\s?(.*)/);
      if (tagged != null) {
        tag = tagged[1];
        value = (_ref = tagged[2]) != null ? _ref.trim() : void 0;
        return this.processTag(tag, value);
      } else if (/^\s*\#[^\#]/.test(clean)) {
        return this.name = clean.slice(clean.indexOf('#') + 1).trim();
      } else {
        if (this.isFunctionTag(this.prevTag)) {
          this.code.push("</dl>");
        }
        this.prevTag = null;
        return this.code.push(clean);
      }
    };

    DocBlock.prototype.processTag = function(tag, value) {
      var c, cats, see, split, xrefs, _i, _j, _len, _len1;
      if (this.isFunctionTag(this.prevTag) && !this.isFunctionTag(tag)) {
        this.code.push("</dl>");
      }
      switch (tag) {
        case "category":
          cats = value.split(/\s*,\s*/);
          for (_i = 0, _len = cats.length; _i < _len; _i++) {
            c = cats[_i];
            this.categories.push(c);
          }
          break;
        case "comp":
          this.comp = value;
          break;
        case "see":
          xrefs = value.split(/\s*,\s*/);
          for (_j = 0, _len1 = xrefs.length; _j < _len1; _j++) {
            see = xrefs[_j];
            this.see.push({
              name: see,
              link: see.charAt(0) === "." ? "#" + (cleanName(see)) : "" + (cleanName(see)) + ".html"
            });
          }
          break;
        case "trigger":
          this.event = value;
          split = value.split(/\s+-\s+/);
          this.triggers.push({
            event: split[0],
            description: split[1],
            objName: split[3] || "Data",
            objProp: split[2] || null
          });
          break;
        case "sign":
          this.code.push("`" + value + "` \n");
          break;
        case "param":
          if (!this.isFunctionTag(this.prevTag)) {
            this.code.push("<dl>");
          }
          split = value.match(/(.+)\s+-\s+(.+)/);
          if (split != null) {
            this.code.push("<dt>" + split[1] + "</dt><dd>" + split[2] + "</dd>");
          }
          break;
        case "return":
        case "returns":
          if (!this.isFunctionTag(this.prevTag)) {
            this.code.push("<dl>");
          }
          break;
        case "example":
          this.code.push("<h4> Example </h4>\n");
          break;
        default:
          this.code.push(value);
      }
      return this.prevTag = tag;
    };

    DocBlock.prototype.isFunctionTag = function(tagname) {
      if (tagname === "return" || tagname === "returns" || tagname === "param") {
        return true;
      } else {
        return false;
      }
    };

    DocBlock.prototype.getContent = function() {
      if (this.isFunctionTag(this.prevTag)) {
        this.code.push("</dl>");
      }
      return this.code.join("\n") + triggerBlock(this.triggers) + seeBlock(this.see);
    };

    return DocBlock;

  })();

  parseJS = function(path) {
    var block, line, lines, ln, open, _i, _len, _results;
    lines = fs.readFileSync(path).toString().split("\n");
    open = false;
    _results = [];
    for (ln = _i = 0, _len = lines.length; _i < _len; ln = ++_i) {
      line = lines[ln];
      if (line.indexOf('/**@') !== -1 && !open) {
        block = new DocBlock();
        block.file = path;
        block.line = ln;
        open = true;
      }
      if (open) {
        block.processLine(line);
      }
      if (line.indexOf('*/') !== -1 && open) {
        open = false;
        processBlock(block);
        if (block.name.length === 0) {
          console.log("No name for block at " + block.file + ":" + (block.line + 1));
        }
        if (block.categories.length === 0 && block.comp === null) {
          console.log("No component or category for block at " + block.file + ":" + (block.line + 1) + " (" + block.name + ")");
        }
        _results.push(data.push(block));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  cleanName = function(name) {
    return name.replace(".", "-");
  };

  triggerBlock = function(triggers, noheader) {
    var block, t, _i, _len;
    if ((triggers != null ? triggers.length : void 0) === 0) {
      return '';
    }
    if (noheader) {
      block = "<dl>";
    } else {
      block = "\n<h4>Events</h4>\n<dl>";
    }
    for (_i = 0, _len = triggers.length; _i < _len; _i++) {
      t = triggers[_i];
      if (t.objProp != null) {
        block += "<dt><span class='event-name'>" + t.event + "</span> [<span class='event-property-name'>" + t.objName + "</span>: <span class='event-property'>" + t.objProp + "</span>]</dt><dd>" + t.description + "</dd>\n";
      } else {
        block += "<dt><span class='event-name'>" + t.event + "</span></dt><dd>" + t.description + "</dd>\n";
      }
    }
    block += "</dl>";
    return block;
  };

  seeBlock = function(refs) {
    var block, r, _i, _len;
    if ((refs != null ? refs.length : void 0) === 0) {
      return '';
    }
    block = "\n<h4>See Also</h4>\n<ul>";
    for (_i = 0, _len = refs.length; _i < _len; _i++) {
      r = refs[_i];
      block += "<li><a href=" + r.link + ">" + r.name + "</a></li>";
    }
    block += "</ul>";
    return block;
  };

  createPage = function(page) {
    var clName, description, eventContent, pageContent, part, partContent, partList, _i, _len, _ref, _ref1, _ref2;
    description = "#" + page.name + "\n";
    description += "\n" + ((_ref = page.block) != null ? _ref.getContent() : void 0);
    if (((_ref1 = page.block.triggers) != null ? _ref1.length : void 0) > 0) {
      eventContent = ("#" + page.name + "\n") + triggerBlock(page.block.triggers, true);
    }
    partContent = "";
    if (page.parts.length) {
      partList = "<div class='doc-contents'><h4>Properties and Methods</h4><ul>";
      _ref2 = page.parts;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        part = _ref2[_i];
        clName = cleanName(part.name);
        partList += "<li><a href='#" + clName + "'>" + part.name + "</a></li>";
        partContent += ("\n\n<div id='" + clName + "' class='docblock'>\n\n<a href='#doc-nav' class='doc-top'>Back to top</a><h2>" + part.name + "</h2>\n") + marked(part.getContent()) + "\n\n</div>\n\n";
        if (part.triggers.length > 0) {
          if (!eventContent) {
            eventContent = "\n<h2>" + page.name + "</h2>\n<hr/>\n";
          }
          eventContent += ("\n<h3>" + part.name + "</h3>\n") + triggerBlock(part.triggers, true);
        }
      }
      partList += "</ul></div>";
    } else {
      partList = "";
    }
    pageContent = description + partList + partContent;
    return [pageContent, eventContent];
  };

  saveMd = function(data) {
    var cat, catName, comp, eventContent, events_html, html, markdown, nav_html, page, pages, template, triggerListed, _i, _j, _len, _len1, _ref, _ref1;
    template = fs.readFileSync(templateName).toString().replace("VERSION_STRING", versionString);
    nav_html = "<ul id='doc-level-one'><li><a href='events.html'>List of Events</a></li>";
    events_html = "";
    pages = [];
    _ref = Table.cats;
    for (catName in _ref) {
      cat = _ref[catName];
      nav_html += "<li>" + catName + "<ul>";
      triggerListed = false;
      for (_i = 0, _len = cat.length; _i < _len; _i++) {
        page = cat[_i];
        nav_html += "<li><a href='" + (cleanName(page.name)) + ".html'>" + page.name + "</a></li>";
        if (page.flagged === true) {
          continue;
        }
        page.flagged = true;
        comp = Table.comps[page.name];
        _ref1 = createPage(comp), markdown = _ref1[0], eventContent = _ref1[1];
        if (eventContent) {
          events_html += marked(eventContent);
        }
        html = marked(markdown);
        pages.push({
          name: page.name,
          content_html: html
        });
      }
      nav_html += "</ul></li>";
    }
    nav_html += "</ul>";
    pendingOperations = pages.length + 2;
    html = template.replace("CONTENT_DIV", events_html).replace("NAV_DIV", nav_html);
    writeOut("events", html);
    html = template.replace("CONTENT_DIV", "").replace("NAV_DIV", nav_html);
    writeOut("index", html);
    for (_j = 0, _len1 = pages.length; _j < _len1; _j++) {
      page = pages[_j];
      html = template.replace("CONTENT_DIV", page.content_html).replace("NAV_DIV", nav_html);
      writeOut(page.name, html);
    }
  };

  tracker = function() {
    pendingOperations--;
    if (pendingOperations <= 0) {
      return docCallback();
    }
  };

  document = function(files, output, template, version, callback) {
    var file, _i, _len;
    docCallback = callback;
    console.log("Parsing source files");
    templateName = template;
    dirOut = output;
    versionString = version;
    for (_i = 0, _len = files.length; _i < _len; _i++) {
      file = files[_i];
      parseJS(file);
    }
    return saveMd(data);
  };

  exports.document = document;

}).call(this);
