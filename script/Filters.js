/* Filters.js

   Logic + UI code for recursively nestable filtering of MUCK output. */

var FilterManager = new (function() {
    /* 'Class' / object prototype function;
       you could think of objects of this type representing a 'lens' through which user can interact
       with the MUCK. For instance, a 'page' filter will show only pages to and from a specific
       person (or a set of people); it also prepends the 'page Someone SomeoneElse YetAnotherPerson='
       command to what the user typed while that filter was selected. */
    function Filter(fn, name, cmd, closable) {

        this.name                   = name  || "";
        this.filter                 = fn    || null;
        this.commandPrepend         = cmd   || "";

        this.selectorElement        = null;

        /* The selectorElement is actually composed of different sub-elements, which allows multiple actions
           (i.e. 'hide this') and reporting a sort of status indicator alongside the filter.  If you add one,
           you might have to change things in KeyboardBindings.js which calls the onclick() methods directly
           stepping up and down the UI... */

        this.selectorSelectEl       = null;
        this.selectorCloseEl        = null;
        this.selectorLinecountEl    = null;
        this.unseenLines            = 0;       /* How many lines were matched since we were last active? */

        /* We don't want the user to be able to close the 'special' filters, so there's a kind of clunky way to
           specify that when constructing one. Note the check specifically for 'false', as just testing for
           non-truthiness would make it unclosable by default if the argument is left off. */
        if(closable !== false) {
            this.closable               = true;
        } else {
            this.closable               = false;
        }

        this.progenitor             = null;

        /* A DOM element that stores all the lines matched by the filter: switching which DOM elements
           are visible is (theoretically) faster than recomputing everything each time, once you begin to
           have a great many lines. */
        this.lineContainerElement   = elem("div", null, "filterContainer");
        MuckInterface.addFilterBody(this.lineContainerElement);
        this.lineContainerElement.style.display = "none";

    }

    Filter.prototype.setupElements          = function() {
        var self = this;

        if(!this.selectorSelectEl) {
            this.selectorSelectEl = elem("span", this.name);

            this.selectorSelectEl.onclick = function() {
                self.selected();
            };
        }

        if(!this.selectorCloseEl) {
            if(this.closable) {
                this.selectorCloseEl = elem("span", " (x)", "closeButton");

                this.selectorCloseEl.onclick = function() {
                    /* If the user is hiding the filter, they probably don't want to see the *old* activity
                       when it pops up again.  So, reset that. */
                    self.unseenLines = 0;
                    self.selectorLinecountEl.innerText = "";

                    Sidebar.remv(self);
                };
            } else {
                this.selectorCloseEl = elem("span");     /* hopefully a 'nop' */
            }
        }

        if(!this.selectorLinecountEl) {
            this.selectorLinecountEl = elem("em");
        }

        if(this.selectorElement) {
            this.selectorElement.innerHTML = "";

            this.selectorElement.appendChild(this.selectorSelectEl);
            this.selectorElement.appendChild(this.selectorLinecountEl);
            this.selectorElement.appendChild(this.selectorCloseEl);
        }
    };

    Filter.prototype.catches                = function(line) {
        var l;

        if(this.progenitor != null) {
            l = this.progenitor.catches(line);
        } else {
            l = line;
        }

        if(l) {
            return this.filter(l);
        }
    };

    Filter.prototype.addChild               = function(child) {
        child.name = this.name + " > " + child.name;
        child.progenitor = this;

        addFilter(child);
    };

        /* What to do when the user selects a filter. */

    Filter.prototype.selected               = function() {
        filterBy(this);
        this.setupElements();
    };

        /* UI-element-handling logic.  registerActivity() is called with each NEW line matched. */

    Filter.prototype.setActive              = function(isActive) {
        if(isActive) {
            this.unseenLines = 0;
            this.selectorLinecountEl.innerHTML = "";

            this.selectorSelectEl.innerHTML = "<strong class='activeFilter'>" + this.name + "</strong>";
            this.lineContainerElement.style.display = "";   // (show)
        } else {
            this.selectorSelectEl.innerHTML = this.name;
            this.lineContainerElement.style.display = "none"; // (hide)
        }
    };

    Filter.prototype.registerActivity       = function() {
        if(!this.selectorElement) {
            Sidebar.add(this);        // will also call .setupElements() for us
        }

        if(this != CurrentFilter) {
            this.unseenLines = this.unseenLines + 1;
            // this.selectorElement.innerHTML = this.name + " <em>(" + this.unseenLines + ")</em>";
            this.selectorLinecountEl.innerHTML = " (" + this.unseenLines + ")";
        }
    };

    /* Global list: prototyping functions for filters;
       each time a line of text comes in from the MUCK, a function further down in this file will,
       first off, run through all the filters that have already been created and see if any of them
       would like to grab said line.  There may be 'special filters' that are an exception to this
       (for instance, the 'unfiltered' and 'everything' controls are filters, just not added to the
       list.)  If any filter would match the line, we stop there (apart from recursively checking the
       matched portion of the line); this helps make sure we don't get a bajillion duplicate filters.

       If no filter takes the line, all the functions in this list will be given a chance to look at
       it.  These each implement one type of filter; if their filter applies to the line they return
       a new Filter object (a derivative of the definition above) specially set up to match that line
       and lines like it.  (For instance, any one 'page' filter only matches a particular set of
       names in the 'page'.)  If their filter doesn't apply to the line they should return null.

       Filter name is very important and usually includes some dynamic element; if you have no name,
       the user won't be able to select your filter at all.

       The inner, callback function must return the part of the line the filter matched, if there is
       a match, or 'false' (i.e., the 'puppet' filter returns just the message the puppet saw when
       matching.)  The matched line segment will be further filtered in case any sub-filters can be
       created.

       The filtering itself is done with a different function than .filter(), which will do some
       recursive stuff so that the nested filters will work properly without any extra effort. */
    FilterList                      = [];

    /* Global var.;
       remembers what filter the user's most recently selected. */
    CurrentFilter                   = null;

    /* Global var.;
       all the active filters we have, including subfilters, excluding 'special' filters. */
    ActiveFilters                   = [];

    /* Global fn.;
       test a line against all the active filters, then, if none match, the list of filtertypes; if it
       creates a new filter, add that to the filter list.

       On a filter match recursively diagnoses what the filter filtered out and if anything wants
       to make a filter out of it, adds that as a sub-filter.

       ...another question: SHOULD we offer EVERY filter type the chance to create a filter on this
       line?  Notice here that the returning if it already matches a filter is to keep from creating
       the same filter over and over......   So far, this hasn't seemed necessary.

       Return true if anything at all matched, or false otherwise. */
    function diagnoseLine(line, parentFilter, el) {
        /* We are now passing around the DOM element rather than just the plain text, though we were
           not before.  This is because we have to deal with making sure it gets added in all the
           appropriate places-- and making sure it doesn't get added to any of them more than once. */

        parentFilter = parentFilter || null;

        var i = null; var m = null;

        for(i = 0; i < ActiveFilters.length; i++) {
            if(ActiveFilters[i].filter(line)) {
                /* We have a match... */

                ActiveFilters[i].lineContainerElement.appendChild(el.cloneNode(true));

                /* Recursively look at the bit of the line that was filtered out.  Doing it this way
                   keeps parent filters from being told they need to alert the player to activity if
                   a child filter got the line. */
                if(!diagnoseLine(ActiveFilters[i].filter(line), ActiveFilters[i], el)) {
                    ActiveFilters[i].registerActivity();
                }

                return true;
            }
        }

        for(i = 0; i < FilterList.length; i++) {
            if(m = FilterList[i](line)) {
                /* We have a new filter.  Make sure we actually add the line that triggered creation of
                   said filter to the filter... */
                if(parentFilter) {
                    parentFilter.addChild(m);
                } else {
                    addFilter(m);
                }

                m.lineContainerElement.appendChild(el.cloneNode(true));
                m.registerActivity();
                return true; /* return m; */
            }
        }

        if(!parentFilter) {
            FilterManager.DefaultFilter.registerActivity();
        }

        return false;
    }

    /* Global fn.;
       add a filter to the filter list + to the web GUI. */
    function addFilter(filter) {
        ActiveFilters.push(filter);
        Sidebar.add(filter);
    }

    /* Global fn.;
       set current filter + filter the visible text elements by said filter. */
    function filterBy(filter) {
        var i;
        var recvTextList = document.getElementsByClassName("muckRecvText");

        CurrentFilter.setActive(false);
        CurrentFilter = filter;
        CurrentFilter.setActive(true);

        MuckInterface.setInputHint(CurrentFilter.commandPrepend);

        /* Otherwise we end up on the very beginning when going to a place with more text, or
           something? */
        MuckInterface.scrollToEnd();

        /* Make the input line grab focus, too. */
        document.getElementById("input-field").focus();
    }

    /* On-page-load hook;
       (see LoadFunctions.js) adds special filters and a UI hook. */
    window.LoadFunctions.push(function() {
        /* Special filter;
           matches everything; can't be in the ActiveFilters list because it would endlessly match
           itself and cause recursion when running diagnoseLine(). */
        CurrentFilter = Sidebar.add(new Filter(function(line) {
            return line;
        }, "everything", null, false)); /* (cmd, closable?) */

        FilterManager.EverythingFilter = CurrentFilter;

        /* Special filter;
           matches everything not matched by another filter; can't be in the ActiveFilters list for
           the same reason. */
        FilterManager.DefaultFilter = Sidebar.add(new Filter(function(line) {
            for(var i = 0; i < ActiveFilters.length; i++) {
                if(ActiveFilters[i].catches(line)) {
                    return false;
                }
            }
            return line;
        }, "unfiltered", null, false));

        /* Let's not announce activity on 'unfiltered' if we just saw it on 'everything'. */
        FilterManager.DefaultFilter.registerActivity = function() {
            if(CurrentFilter != FilterManager.EverythingFilter) {
                Filter.prototype.registerActivity.call(this);
            }
        };

        /* Act as if the user had set the filter to 'everything' when we're starting out. */
        CurrentFilter.selected();

        /* Setup our 'hooks' for the user input/output. */
        MuckInterface.OnMuckText.push(function(elem) {
            diagnoseLine(textOf(elem), null, elem);

            /* Handle special cases for the "special" filters, which can't just make it up
               on the fly anymore, and so won't get used otherwise. */
            FilterManager.EverythingFilter.lineContainerElement.appendChild(elem);

            if (FilterManager.DefaultFilter.catches(textOf(elem))) {
                FilterManager.DefaultFilter.lineContainerElement.appendChild(elem.cloneNode(true));
            }

            /* Scroll the page down if this line is actually in view. */
            if (CurrentFilter.catches(textOf(elem))) {
                MuckInterface.scrollToEnd();
            }

            return true;
        });

        MuckInterface.OnPlayerText.push(function(txt) {
            return CurrentFilter.commandPrepend + txt;
        });

        /* Let the user set the input prefix with a command (in case, say, they can't press the Control
           key to use the keyboard shortcut.) */
        CommandManager.register(new Command("setPrefix", function(txt) {
            CurrentFilter.commandPrepend = txt;
            MuckInterface.setInputHint(txt);
        }).understand("prefix")
          .understand("pfx")
          .explain("Change the current input prefix to the argument of the command. (i.e., type '/setPrefix page Peter=' to have everything you type sent to Peter.) /setPrefix alone removes the prefix. Each filter has its own prefix."));

    });

    /**************************************************************************************
     **************************************************************************************
     * Now we get to the 'filters' themselves... */

    /* Filter prototype(r) - puppets;
       catches and then filters I/O from a puppet. Ret.: filter object if line is from a puppet, or
       'null'. */
    FilterList.push(function(line) {
        var m;

        if(m = line.match(/^([^>< ]+)> (.*)/)) {
            return new Filter(function(line) {
                var md;

                if(md = line.match(new RegExp("^" + escapeRegExp(m[1]) + "> (.*)?"))) {
                    return md[1] || " ";
                } else {
                    return false;
                }
            }, "puppet["+ m[1] +"]");
        } else {
            return null;
        }
    });

    /* Filter prototype(r) - pages;
       this is going to get complicated, probably.

       Later on:  The page filters need to be revisited if they're going to work for people
       who don't have my custom page set-up which makes things more regular/predictable as a
       side effect.  For one thing, they may have a curious little problem when a "'s", for
       instance, in a page-pose, or a comma trailing the name, or etc., happens -- they'll
       think it's a new player... */
    Filter.getPagers = function(line) {
        var result, i;

        if(match        = line.match(/^You page, "(.+)" to ([^"]+)\.?/)) {
            result = match[2];

        } else if(match = line.match(/^You page-pose, "(.+)" to ([^"]+)\.?/)) {
            result = match[2];

        } else if(match = line.match(/^([^ ]+) pages, "(.+)" to ([^"]*)?you\./)) {
            if(match[3]) {
                result = match[1] +" "+ match[3];
            } else {
                result = match[1];
            }

        /* This might have failed horribly if there is a 'and you,' somewhere in the paged text. Which
           is very plausible. More testing is needed. There might be similar things elsewhere? I don't
           know.

            ... though I was able to make the first group non-greedy and thus solve the problem (I think.) */
        } else if(match = line.match(/^In a page-pose to (.+?) and you, ([^ ]+) (.+)/)) {
            result = match[1] +" "+ match[2];

        } else if(match = line.match(/^In a page-pose to you, ([^ ]+) (.+)/)) {
            result = match[1];

        } else if(match = line.match(/^<(.+?)> (.+) \(to you(.+)? @/)) {
            if(match[3]) {
                result = match[1] + " " + match[3];
            } else {
                result = match[1];
            }

        } else {
            return null;
        }

        result = result.replace(" and ", " ").split(/,?\s+/).sort();

        var out = [];

        for(i = 0; i < result.length; i++) {
            /* Things that can be / are often found on end of names in page-poses */
            result[i] = result[i].replace(/'s$/, '');
            result[i] = result[i].replace(/,$/,  '');
            result[i] = result[i].replace(/\.$/, '');

            /* Sometimes there's an empty string still?  (Yes, sometimes there is.) */
            if(result[i].match(/[A-Za-z]/)) {
                out.push(result[i]);
            }
        }

        return out;
    };

    Filter.getPageMessage = function(line) {
        if(match        = line.match(/^You page, "(.+)" to (.+)\.?/)) {
            return match[1];

        } else if(match = line.match(/^You page-pose, "(.+)" to ([^"]+)\.?/)) {
            return match[1];

        } else if(match = line.match(/([^ ]+) pages, "(.+)" to (.*)?you\./)) {
            return match[2];

        } else if(match = line.match(/In a page-pose to (.+?) and you, ([^ ]+) (.+)/)) {
            return match[2] +" "+ match[3];

        } else if(match = line.match(/In a page-pose to you, ([^ ]+) (.+)/)) {
            return match[1] +" "+ match[2];

        } else if(match = line.match(/^<(.+?)> (.+) \(to .+/)) {
            return match[2];

        } else {
            return null;
        }
    };

    FilterList.push(function(line) {
        var names;

        if(names = Filter.getPagers(line)) {

            /* Puppets, when you page them, have bits of information added to their displayed names;
               we need a copied list of names with any such extra bits of information taken off, so
               that when we construct a command to page said puppets it works properly. */
            var i;
            var namesToPage = names.slice(0); /* Apparently this copies the array? */
            var match;

            for(i = 0; i < namesToPage.length; i++) {
                if(match = namesToPage[i].match(/^(.*)\(Z\)\[([^\]]+)\]$/)) {
                    /* It's a puppet, which have info's about the player owning; this is fine and even desirable
                       when just displaying the name, but not when composing a 'page' command. */
                    namesToPage[i] = match[1];
                }
            }

            return new Filter(function(line) {

                if(Filter.getPagers(line) && Filter.getPagers(line).join("") == names.join("")) {
                    return Filter.getPageMessage(line);
                } else {
                    return false;
                }

            }, "page[" + names.join(", ") + "]", "page " + namesToPage.join(" ") + "=");

        }

        return null;
    });

    /* Filter protoype(r) - whispers;
       hopefully simpler than pages. */
    Filter.getWhisperers = function(line) {
        var result;
        var match;

        if(match        = line.match(/^(.+?) whispers, "(.+)" to (.+ and )?you./)) {
            if(match[3]) {
                result = match[1] +" "+ match[3].replace(" and ", "");
            } else {
                result = match[1];
            }

        } else if(match = line.match(/^You whisper, "(.+)" to (.+)./)) {
            result = match[2];

        } else {
            return null;
        }

        return result.split(/,?\s+/).sort();
    }

    Filter.getWhisper = function(line) {
        var match;

        if(match        = line.match(/^(.+?) whispers, "(.+)" to (.+ and )?you./)) {
            return match[2];
        } else if(match = line.match(/^You whisper, "(.+)" to (.+)./)) {
            return match[1];
        } else {
            return null;
        }
    }

    FilterList.push(function(line) {
        var names;

        if(names = Filter.getWhisperers(line)) {
            return new Filter(function(line) {
                if(Filter.getWhisperers(line) && Filter.getWhisperers(line).join("") == names.join("")) {
                    return Filter.getWhisper(line);
                } else {
                    return false;
                }
            }, "whisper[" + names.join(", ") + "]", "whisper " + names.join(" ") + "=");
        }

        return null;
    });

    /* Filter prototype(r) - 'com' channels;
       finally, something easy!  (Well, kind of.)   (Okay, that wasn't *that* easy.)

       There was a really weird bug here where the filter would break on Tash-Ki'ira's name ...
       it's gone now, I still have no idea what caused it. */
    FilterList.push(function(line) {
        var match = line.match(/^Com \[(.+?)\] ([^\s]+) says: <(.+)>/);

        if(!match) {
            match = line.match(/^Com \[(.+?)\] <([^\s]+) .*>/);
        }

        if(match) {
            return new Filter(function(line) {
                var m;

                if(m = line.match(new RegExp("^Com \\[" +escapeRegExp(match[1])+ "\\] (.+) says: <(.+)>"))) {
                    return m[2];
                } else if(m = line.match(new RegExp("^Com \\[" +escapeRegExp(match[1])+ "\\] <(.*)>"))) {
                    return m[1];
                } else {
                    return false;
                }
            }, "com[" + match[1] + "]", "com #" + match[1] + " ");
        }

        return null;
    });

}) () ;
