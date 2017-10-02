
/* GlobalFunctions.js

   Various functions and things that don't go anywhere specific. */

window.LoadFunctions = [];

window.onload = function() {
    for(var i = 0; i < window.LoadFunctions.length; i++) {
        window.LoadFunctions[i]();
    }
};

window.ResizeFunctions = [];

window.onresize = function() {
    for(var i = 0; i < window.ResizeFunctions.length; i++) {
        window.ResizeFunctions[i]();
    }
};

/* http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
   I'm not sure if this is the best way to do it. But it can always be changed. */
function saveTextFile(filename, data) {
    var blob = new Blob([data], {type: 'text/plain'});

    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem)
        elem.click();
        document.body.removeChild(elem);
    }
}

/* From the Mozilla Developer Network page on Regexps;
   turn user input into a string properly escaped to be included in a regular
   expression. */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/* Create an element: type, content (HTML), class */
function elem(type, inner, c) {
    c = c || null;
    type  = type || "div";

    var e = document.createElement(type);

    if (inner)
        e.innerHTML = inner;
    if (c)
        e.className = c;

    return e;
}

/* Get inner text (*not* HTML) from a DOM element. */
function textOf(elem) {
    return elem.textContent || elem.innerText || "";
}

/* Manipulate 'display' CSS to hide/show a DOM element. */
function hideEl(e) {
    e.style.display = "none";
}

function showEl(e) {
    e.style.display = "";
}

function byID(id) {
    return document.getElementById(id);
}

function should(thing) {
    if(byID("do" + thing)) {
        return byID("do" + thing).checked;
    } else {
        return false;
    }
}
